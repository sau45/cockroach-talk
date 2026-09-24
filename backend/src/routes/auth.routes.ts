import { Router } from 'express';
import { createAuthController } from '../controllers/auth.controller.js';

export function createAuthRouter(): Router {
  const router = Router();
  const controller = createAuthController();

  router.get('/session', controller.getSession);
  router.get('/profile/:tag', controller.getProfile);
  router.post('/profile', controller.updateProfile);
  router.post('/customize', controller.customizeProfile);
  router.post('/reroll-name', controller.rerollName);
  router.post('/consent', controller.submitConsent);
  router.post('/heartbeat', controller.heartbeat);

  return router;
}
