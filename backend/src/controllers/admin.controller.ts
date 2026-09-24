import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Server } from 'socket.io';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { DeviceSecurity } from '../models/DeviceSecurity.js';
import { AuditLog } from '../models/AuditLog.js';
import { securityService } from '../services/security.service.js';
import { junctionRooms, buildRoomStatePayload } from '../services/rooms.service.js';

export function createAdminController(io: Server) {
  function kickBannedUser(tag: string) {
    for (const [roomId, room] of junctionRooms.entries()) {
      let kicked = false;

      const activeIdx = room.activeMembers.findIndex((m) => m.tag === tag);
      if (activeIdx !== -1) {
        const socketId = room.activeMembers[activeIdx].socketId;
        room.activeMembers.splice(activeIdx, 1);
        io.to(socketId).emit('banned', { message: 'You have been banned.' });
        io.sockets.sockets.get(socketId)?.disconnect(true);
        kicked = true;
      }

      const waitIdx = room.waitingQueue.findIndex((m) => m.tag === tag);
      if (waitIdx !== -1) {
        const socketId = room.waitingQueue[waitIdx].socketId;
        room.waitingQueue.splice(waitIdx, 1);
        io.to(socketId).emit('banned', { message: 'You have been banned.' });
        io.sockets.sockets.get(socketId)?.disconnect(true);
        kicked = true;
      }

      if (kicked) {
        const payload = buildRoomStatePayload(roomId);
        if (payload) io.to(roomId).emit('room-state-update', payload);
      }
    }
  }

  const submitReportSchema = z.object({
    reporterTag: z.string().min(1),
    reportedTag: z.string().min(1),
    category: z.enum(['harassment', 'spam', 'hate_speech', 'inappropriate_content', 'other']).optional(),
    reason: z.string().min(1),
    note: z.string().optional(),
    messageId: z.string().optional()
  });

  return {
    async submitReport(req: Request, res: Response, next: NextFunction) {
      try {
        const parsed = submitReportSchema.parse(req.body);
        const reporterFp = (req.headers['x-device-fingerprint'] as string) || req.user?.tag || null;

        const result = await securityService.handleUserReport({
          reporterTag: parsed.reporterTag,
          reportedTag: parsed.reportedTag,
          category: parsed.category || 'other',
          reason: parsed.reason,
          note: parsed.note,
          messageId: parsed.messageId,
          reporterFingerprint: reporterFp || undefined
        });

        return res.json({
          success: true,
          message: 'Report submitted successfully. Thank you for keeping CockroachTalk safe.',
          reportId: result.report._id,
          escalated: result.escalated,
          currentStrikes: result.currentStrikes
        });
      } catch (err) {
        next(err);
      }
    },

    async reportUser(req: Request, res: Response, next: NextFunction) {
      try {
        const parsed = submitReportSchema.parse(req.body);
        const reporterFp = (req.headers['x-device-fingerprint'] as string) || req.user?.tag || null;

        const result = await securityService.handleUserReport({
          reporterTag: parsed.reporterTag,
          reportedTag: parsed.reportedTag,
          category: parsed.category || 'other',
          reason: parsed.reason,
          note: parsed.note,
          messageId: parsed.messageId,
          reporterFingerprint: reporterFp || undefined
        });

        return res.json({
          success: true,
          message: 'Report submitted successfully.',
          reportId: result.report._id,
          escalated: result.escalated
        });
      } catch (err) {
        next(err);
      }
    },

    async getReports(req: Request, res: Response, next: NextFunction) {
      try {
        const reports = await Report.find({ status: 'pending' }).sort({ createdAt: -1 });
        return res.json({ success: true, reports });
      } catch (err) {
        next(err);
      }
    },

    async banUser(req: Request, res: Response, next: NextFunction) {
      try {
        const { targetTag } = req.body;
        if (!targetTag) {
          return res.status(400).json({ success: false, message: 'Missing target tag' });
        }

        await User.updateOne({ tag: targetTag }, { $set: { isBanned: true } });
        await Report.updateMany({ reportedTag: targetTag }, { $set: { status: 'banned' } });
        kickBannedUser(targetTag);

        return res.json({ success: true, message: `User ${targetTag} banned successfully.` });
      } catch (err) {
        next(err);
      }
    },

    async dismissReport(req: Request, res: Response, next: NextFunction) {
      try {
        const { reportId } = req.body;
        if (!reportId) {
          return res.status(400).json({ success: false, message: 'Missing reportId' });
        }

        await Report.findByIdAndUpdate(reportId, { $set: { status: 'dismissed' } });
        return res.json({ success: true, message: 'Report dismissed.' });
      } catch (err) {
        next(err);
      }
    },

    async getBannedUsers(req: Request, res: Response, next: NextFunction) {
      try {
        const bannedUsers = await User.find({ isBanned: true }).sort({ updatedAt: -1 });
        return res.json({ success: true, bannedUsers });
      } catch (err) {
        next(err);
      }
    },

    async unbanUser(req: Request, res: Response, next: NextFunction) {
      try {
        const { targetTag } = req.body;
        if (!targetTag) {
          return res.status(400).json({ success: false, message: 'Missing target tag' });
        }

        await User.updateOne({ tag: targetTag }, { $set: { isBanned: false } });
        return res.json({ success: true, message: `User ${targetTag} unbanned successfully.` });
      } catch (err) {
        next(err);
      }
    },

    // --- Automated Security & Abuse Detection Endpoints ---

    // Live Activity Feed
    async getSecurityFeed(req: Request, res: Response, next: NextFunction) {
      try {
        const feed = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
        return res.json({ success: true, feed });
      } catch (err) {
        next(err);
      }
    },

    // Review Queue (Flagged items + User Reports)
    async getReviewQueue(req: Request, res: Response, next: NextFunction) {
      try {
        const queue = await AuditLog.find({
          action: { $in: ['auto_flag', 'user_report'] },
          reversed: false
        })
          .sort({ createdAt: -1 })
          .limit(50);
        return res.json({ success: true, queue });
      } catch (err) {
        next(err);
      }
    },

    // Review Action (Approve / Reject)
    async resolveReviewItem(req: Request, res: Response, next: NextFunction) {
      try {
        const { logId, decision } = req.body;
        if (!logId || !decision) {
          return res.status(400).json({ success: false, message: 'logId and decision required' });
        }

        const log = await AuditLog.findById(logId);
        if (!log) {
          return res.status(404).json({ success: false, message: 'Review log not found' });
        }

        log.reversed = true;
        await log.save();

        // Update tied Report record if applicable
        if (log.metadata && log.metadata.reportId) {
          const reportStatus = (decision === 'strike' || decision === 'reject_mute') ? 'banned' : 'reviewed';
          await Report.findByIdAndUpdate(log.metadata.reportId, { status: reportStatus });
        }

        if (decision === 'strike' || decision === 'reject_mute') {
          await securityService.overrideAction({
            fingerprint: log.fingerprint,
            action: 'manual_ban',
            adminNote: `Admin confirmed enforcement for ${log.action}: ${log.details?.substring(0, 50)}`
          });
        }

        return res.json({ success: true, message: `Review item marked as ${decision}` });
      } catch (err) {
        next(err);
      }
    },

    // Device Risk Profile
    async getDeviceProfile(req: Request, res: Response, next: NextFunction) {
      try {
        const { fingerprint } = req.params;
        let device = await DeviceSecurity.findOne({ fingerprint });
        if (!device) {
          // If searching by tag instead of fingerprint
          device = await DeviceSecurity.findOne({ associatedTags: fingerprint });
          if (!device) {
            return res.status(404).json({ success: false, message: 'Device not found' });
          }
        }
        return res.json({ success: true, device });
      } catch (err) {
        next(err);
      }
    },

    // Admin Override Controls
    async applyOverride(req: Request, res: Response, next: NextFunction) {
      try {
        const { fingerprint, action, adminNote } = req.body;
        if (!fingerprint || !action) {
          return res.status(400).json({ success: false, message: 'fingerprint and action required' });
        }

        const updated = await securityService.overrideAction({
          fingerprint,
          action,
          adminNote
        });

        if (!updated) {
          return res.status(404).json({ success: false, message: 'Device not found' });
        }

        return res.json({ success: true, device: updated });
      } catch (err) {
        next(err);
      }
    },

    // Threshold Configuration (Get & Update)
    async getSecurityConfig(req: Request, res: Response, next: NextFunction) {
      try {
        const config = await securityService.getConfig();
        return res.json({ success: true, config });
      } catch (err) {
        next(err);
      }
    },

    async updateSecurityConfig(req: Request, res: Response, next: NextFunction) {
      try {
        const updated = await securityService.updateConfig(req.body);
        return res.json({ success: true, config: updated });
      } catch (err) {
        next(err);
      }
    },

    // Metrics & Summary View
    async getSecurityMetrics(req: Request, res: Response, next: NextFunction) {
      try {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
          totalDevices,
          shadowBannedCount,
          hardBannedCount,
          activeMutesCount,
          dailyActionsCount,
          weeklyActionsCount,
          triggerBreakdown
        ] = await Promise.all([
          DeviceSecurity.countDocuments(),
          DeviceSecurity.countDocuments({ isShadowBanned: true }),
          DeviceSecurity.countDocuments({ isHardBanned: true }),
          DeviceSecurity.countDocuments({ currentPenalty: 'mute' }),
          AuditLog.countDocuments({ createdAt: { $gte: oneDayAgo }, action: { $ne: 'threshold_update' } }),
          AuditLog.countDocuments({ createdAt: { $gte: oneWeekAgo }, action: { $ne: 'threshold_update' } }),
          AuditLog.aggregate([
            { $match: { createdAt: { $gte: oneWeekAgo } } },
            { $group: { _id: '$triggerReason', count: { $sum: 1 } } }
          ])
        ]);

        return res.json({
          success: true,
          metrics: {
            totalDevices,
            shadowBannedCount,
            hardBannedCount,
            activeMutesCount,
            dailyActionsCount,
            weeklyActionsCount,
            triggerBreakdown: triggerBreakdown.map((t) => ({ reason: t._id, count: t.count }))
          }
        });
      } catch (err) {
        next(err);
      }
    }
  };
}
