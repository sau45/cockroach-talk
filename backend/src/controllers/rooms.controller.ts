import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import * as roomsService from '../services/rooms.service.js';

export function createRoomsController(io: Server) {
  const createRoomSchema = z.object({
    topic: z.string().min(1, 'Room topic is required').max(50),
    password: z.string().min(1, 'Password is required to create a room').max(50)
  });

  const leaveRoomSchema = z.object({
    roomId: z.string().min(1, 'roomId is required'),
    tag: z.string().min(1, 'tag is required')
  });

  return {
    getRooms(req: Request, res: Response) {
      const rooms = roomsService.getRoomsSummary();
      return res.json(rooms);
    },

    createRoom(req: Request, res: Response, next: NextFunction) {
      try {
        const { topic, password } = createRoomSchema.parse(req.body);
        const roomId = roomsService.createCustomRoom(topic, password);
        return res.json({ success: true, roomId });
      } catch (err) {
        next(err);
      }
    },

    leaveRoom(req: Request, res: Response, next: NextFunction) {
      try {
        const { roomId, tag } = leaveRoomSchema.parse(req.body);
        const changed = roomsService.removeUserFromRoom(roomId, tag);
        if (changed) {
          const payload = roomsService.buildRoomStatePayload(roomId);
          if (payload) {
            io.to(roomId).emit('room-state-update', payload);
          }
        }
        return res.json({ success: true });
      } catch (err) {
        next(err);
      }
    },

    getTurnCredentials(req: Request, res: Response) {
      if (env.TURN_USERNAME && env.TURN_CREDENTIAL) {
        return res.json({
          iceServers: [
            { urls: 'stun:stun.relay.metered.ca:80' },
            { urls: 'turn:global.relay.metered.ca:80', username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL },
            { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL },
            { urls: 'turn:global.relay.metered.ca:443', username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL },
            { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: env.TURN_USERNAME, credential: env.TURN_CREDENTIAL }
          ]
        });
      }

      return res.json({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
    }
  };
}
