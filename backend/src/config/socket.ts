import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { corsOptions } from './cors.js';
import { junctionRooms, buildRoomStatePayload } from '../services/rooms.service.js';
import { env } from './env.js';
import { registerRoomHandlers } from '../sockets/room.handlers.js';
import { registerWebRTCHandlers } from '../sockets/webrtc.handlers.js';
import { registerTypingHandlers } from '../sockets/typing.handlers.js';

export function initializeSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOptions.origin as any,
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    let currentRoomId: string | null = null;
    let currentUserProfile: any = null;

    const getCurrentRoomId = () => currentRoomId;
    const setCurrentRoomId = (id: string | null) => {
      currentRoomId = id;
    };
    const getUserProfile = () => currentUserProfile;
    const setUserProfile = (profile: any) => {
      currentUserProfile = profile;
    };

    registerRoomHandlers(
      io,
      socket,
      getCurrentRoomId,
      setCurrentRoomId,
      getUserProfile,
      setUserProfile
    );
    registerWebRTCHandlers(io, socket, getCurrentRoomId, getUserProfile);
    registerTypingHandlers(socket, getCurrentRoomId, getUserProfile);

    // Admin Real-Time Live Feed Channel
    socket.on('join-admin-channel', ({ password }: { password?: string }) => {
      if (password === env.ADMIN_PASSWORD) {
        socket.join('admin-channel');
        socket.emit('admin-channel-joined', { success: true });
      } else {
        socket.emit('admin-channel-joined', { success: false, message: 'Invalid admin credentials' });
      }
    });
  });

  // Periodic tick every 5 seconds to update timers and cleanup empty custom rooms
  setInterval(() => {
    const now = Date.now();
    for (const roomId of junctionRooms.keys()) {
      const room = junctionRooms.get(roomId);
      if (!room) continue;

      // Cleanup empty custom rooms older than 5 minutes
      if (room.isCustom) {
        if (room.activeMembers.length === 0 && room.waitingQueue.length === 0) {
          if (!room.emptySince) {
            room.emptySince = now;
          } else if (now - room.emptySince > 5 * 60 * 1000) {
            junctionRooms.delete(roomId);
            console.log(`[Room Cleanup] Deleted empty custom room: ${roomId}`);
            continue;
          }
        } else {
          room.emptySince = null;
        }
      }

      if (room.activeMembers.length > 0 || room.waitingQueue.length > 0) {
        const payload = buildRoomStatePayload(roomId, now);
        if (payload) {
          io.to(roomId).emit('room-state-update', payload);
        }
      }
    }
  }, 5000);

  return io;
}
