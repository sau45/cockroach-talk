import { Router } from 'express';
import { Server } from 'socket.io';
import { createCommentsController } from '../controllers/comments.controller.js';
import { commentLimiter, voteLimiter } from '../middleware/rateLimiter.js';

export function createCommentsRouter(io: Server): Router {
  const router = Router();
  const controller = createCommentsController(io);

  router.get('/', controller.getComments);
  router.post('/', commentLimiter, controller.postComment);
  router.patch('/:id', controller.editComment);
  router.delete('/:id', controller.deleteComment);
  router.post('/:id/vote', voteLimiter, controller.voteComment);

  return router;
}
