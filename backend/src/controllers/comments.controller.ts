import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Server } from 'socket.io';
import * as commentsService from '../services/comments.service.js';
import * as votingService from '../services/voting.service.js';
import { generateRealisticName } from '../services/nameGenerator.service.js';
import { securityService } from '../services/security.service.js';
import { User } from '../models/User.js';

export function createCommentsController(io: Server) {
  const getCommentsSchema = z.object({
    roomId: z.string().min(1, 'roomId is required'),
    sort: z.enum(['best', 'new', 'old', 'controversial']).optional().default('best')
  });

  const postCommentSchema = z.object({
    roomId: z.string().min(1, 'roomId is required'),
    body: z.string().min(1).max(1000, 'Comment exceeds 1000 characters'),
    parentId: z.string().nullable().optional()
  });

  const editCommentSchema = z.object({
    body: z.string().min(1).max(1000, 'Comment exceeds 1000 characters')
  });

  const voteCommentSchema = z.object({
    value: z.union([z.literal(1), z.literal(-1), z.literal(0)])
  });

  return {
    async getComments(req: Request, res: Response, next: NextFunction) {
      try {
        const query = getCommentsSchema.parse(req.query);
        const comments = await commentsService.getCommentsForRoom(query.roomId, query.sort, req.user?.tag);
        return res.json({ success: true, comments });
      } catch (err) {
        next(err);
      }
    },

    async postComment(req: Request, res: Response, next: NextFunction) {
      try {
        const parsed = postCommentSchema.parse(req.body);
        const authorTag = req.user?.tag || (req.body.authorTag as string);
        const authorName = req.user?.handle || (req.body.authorName as string) || generateRealisticName(req.user?.gender, authorTag);

        if (!authorTag) {
          return res.status(401).json({ success: false, message: 'Missing user identity' });
        }

        const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
        const devFp = (req.headers['x-device-fingerprint'] as string) || authorTag || 'unknown-client';

        const evalResult = await securityService.evaluateMessage({
          fingerprint: devFp,
          ip: clientIp,
          tag: authorTag,
          text: parsed.body,
          roomId: parsed.roomId
        });

        if (!evalResult.allowed) {
          return res.status(403).json({
            success: false,
            message: evalResult.message || 'Comment rejected by moderation policy.'
          });
        }

        const userRec = await User.findOne({ tag: authorTag });
        const result = await commentsService.createComment({
          roomId: parsed.roomId,
          authorTag,
          authorName: userRec?.handle || authorName,
          authorAvatarType: userRec?.avatarType || 'initials',
          authorAvatarValue: userRec?.avatarValue || '',
          authorAccentColor: userRec?.accentColor || 'cyber-purple',
          authorBubbleStyle: userRec?.bubbleStyle || 'rounded',
          authorStatus: userRec?.statusTag || '',
          body: parsed.body,
          parentId: parsed.parentId,
          isShadowBanned: evalResult.isShadowBanned,
          toxicityScore: evalResult.score
        });

        if (!result.success || !result.comment) {
          return res.status(400).json({ success: false, message: result.message || 'Error posting' });
        }

        // Only broadcast to room if author is not shadow-banned
        if (!evalResult.isShadowBanned) {
          io.to(parsed.roomId).emit('thread:new', result.comment);

          if (parsed.parentId && result.parentDoc) {
            const preview =
              result.parentDoc.body.length > 50
                ? result.parentDoc.body.substring(0, 50) + '...'
                : result.parentDoc.body;
            io.to(parsed.roomId).emit('thread:reply-notify', {
              parentId: result.parentDoc._id,
              parentPreview: preview,
              replyId: result.comment._id,
              replyAuthor: result.comment.authorName
            });
          }
        }

        return res.json({ success: true, comment: result.comment });
      } catch (err) {
        next(err);
      }
    },

    async editComment(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const parsed = editCommentSchema.parse(req.body);
        const authorTag = req.user?.tag || (req.body.authorTag as string);

        if (!authorTag) {
          return res.status(401).json({ success: false, message: 'Missing user identity' });
        }

        const result = await commentsService.editComment(id, authorTag, parsed.body);
        if (!result.success || !result.comment) {
          return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }

        io.to(result.comment.roomId).emit('thread:updated', result.comment);
        return res.json({ success: true, comment: result.comment });
      } catch (err) {
        next(err);
      }
    },

    async deleteComment(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const authorTag = req.user?.tag || (req.body.authorTag as string);
        const isAdmin = !!req.body.isAdmin;

        if (!authorTag && !isAdmin) {
          return res.status(401).json({ success: false, message: 'Missing user identity' });
        }

        const result = await commentsService.deleteComment(id, authorTag, isAdmin);
        if (!result.success || !result.roomId) {
          return res.status(result.statusCode || 400).json({ success: false, message: result.message });
        }

        io.to(result.roomId).emit('thread:deleted', { id });
        return res.json({ success: true });
      } catch (err) {
        next(err);
      }
    },

    async voteComment(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const parsed = voteCommentSchema.parse(req.body);
        const userTag = req.user?.tag || (req.body.userTag as string);

        if (!userTag) {
          return res.status(401).json({ success: false, message: 'Missing user identity' });
        }

        const result = await votingService.processVote(id, userTag, parsed.value);
        if (!result.success || !result.comment) {
          return res.status(400).json({ success: false, message: result.message || 'Voting failed' });
        }

        io.to(result.comment.roomId).emit('thread:vote', {
          id: result.comment._id,
          score: result.comment.score,
          upvotes: result.comment.upvotes,
          downvotes: result.comment.downvotes
        });

        return res.json({ success: true, comment: result.comment });
      } catch (err) {
        next(err);
      }
    }
  };
}
