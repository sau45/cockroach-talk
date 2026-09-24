import { Router } from 'express';
import { Server } from 'socket.io';
import { createRoomsController } from '../controllers/rooms.controller.js';

export function createRoomsRouter(io: Server): Router {
  const router = Router();
  const controller = createRoomsController(io);

  router.get('/', controller.getRooms);
  router.post('/create-room', controller.createRoom);
  router.post('/leave-room', controller.leaveRoom);
  router.get('/turn-credentials', controller.getTurnCredentials);

  return router;
}
