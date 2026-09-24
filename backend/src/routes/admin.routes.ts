import { Router } from 'express';
import { Server } from 'socket.io';
import { createAdminController } from '../controllers/admin.controller.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

export function createAdminRouter(io: Server): Router {
  const router = Router();
  const controller = createAdminController(io);

  router.post('/reports', controller.submitReport);
  router.post('/report-user', controller.reportUser);
  router.get('/reports', requireAdmin, controller.getReports);
  router.post('/ban', requireAdmin, controller.banUser);
  router.post('/dismiss', requireAdmin, controller.dismissReport);
  router.get('/banned', requireAdmin, controller.getBannedUsers);
  router.post('/unban', requireAdmin, controller.unbanUser);

  // Automated Security Moderation & Audit Routes
  router.get('/security/feed', requireAdmin, controller.getSecurityFeed);
  router.get('/security/review-queue', requireAdmin, controller.getReviewQueue);
  router.post('/security/review-action', requireAdmin, controller.resolveReviewItem);
  router.get('/security/device/:fingerprint', requireAdmin, controller.getDeviceProfile);
  router.post('/security/override', requireAdmin, controller.applyOverride);
  router.get('/security/config', requireAdmin, controller.getSecurityConfig);
  router.put('/security/config', requireAdmin, controller.updateSecurityConfig);
  router.get('/security/metrics', requireAdmin, controller.getSecurityMetrics);

  return router;
}
