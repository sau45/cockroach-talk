import { Server, Socket } from 'socket.io';
import { getJunctionRoom } from '../services/rooms.service.js';

interface SignalPayload {
  targetSocketId: string;
  offer?: any;
  answer?: any;
  candidate?: any;
}

/**
 * Validates whether two sockets belong to the same active stage in the same room.
 * Prevents cross-room signaling leakage and unauthorized client signaling.
 */
function validateSignalingContext(
  roomId: string | null,
  senderSocketId: string,
  targetSocketId: string
): boolean {
  if (!roomId || !targetSocketId || senderSocketId === targetSocketId) {
    return false;
  }

  const room = getJunctionRoom(roomId);
  if (!room) {
    return false;
  }

  // Ensure both sender and target are active stage members in this room
  const isSenderActive = room.activeMembers.some((m) => m.socketId === senderSocketId);
  const isTargetActive = room.activeMembers.some((m) => m.socketId === targetSocketId);

  return isSenderActive && isTargetActive;
}

export function registerWebRTCHandlers(
  io: Server,
  socket: Socket,
  getCurrentRoomId: () => string | null,
  getUserProfile: () => any
) {
  // Relay WebRTC Offer (Scoped to Room & Active Stage)
  socket.on('signal-offer', ({ targetSocketId, offer }: SignalPayload) => {
    const roomId = getCurrentRoomId();
    if (!validateSignalingContext(roomId, socket.id, targetSocketId)) {
      console.warn(`[WebRTC] Blocked unauthorized signal-offer from ${socket.id} to ${targetSocketId} in room ${roomId}`);
      return;
    }

    io.to(targetSocketId).emit('signal-offer', {
      senderSocketId: socket.id,
      offer,
      senderProfile: getUserProfile(),
      roomId
    });
  });

  // Relay WebRTC Answer (Scoped to Room & Active Stage)
  socket.on('signal-answer', ({ targetSocketId, answer }: SignalPayload) => {
    const roomId = getCurrentRoomId();
    if (!validateSignalingContext(roomId, socket.id, targetSocketId)) {
      console.warn(`[WebRTC] Blocked unauthorized signal-answer from ${socket.id} to ${targetSocketId} in room ${roomId}`);
      return;
    }

    io.to(targetSocketId).emit('signal-answer', {
      senderSocketId: socket.id,
      answer,
      roomId
    });
  });

  // Relay WebRTC ICE Candidate (Scoped to Room & Active Stage)
  socket.on('signal-candidate', ({ targetSocketId, candidate }: SignalPayload) => {
    const roomId = getCurrentRoomId();
    if (!validateSignalingContext(roomId, socket.id, targetSocketId)) {
      console.warn(`[WebRTC] Blocked unauthorized signal-candidate from ${socket.id} to ${targetSocketId} in room ${roomId}`);
      return;
    }

    io.to(targetSocketId).emit('signal-candidate', {
      senderSocketId: socket.id,
      candidate,
      roomId
    });
  });

  // Renegotiation Request (for adding/removing video tracks mid-call)
  socket.on('signal-renegotiate', ({ targetSocketId }: { targetSocketId: string }) => {
    const roomId = getCurrentRoomId();
    if (!validateSignalingContext(roomId, socket.id, targetSocketId)) {
      return;
    }

    io.to(targetSocketId).emit('signal-renegotiate', {
      senderSocketId: socket.id,
      roomId
    });
  });

  // Call Recording Toggle Broadcast (Notifies all room participants for consent & transparency)
  socket.on('recording-toggle', ({ isRecording }: { isRecording: boolean }) => {
    const roomId = getCurrentRoomId();
    if (roomId) {
      const user = getUserProfile();
      io.to(roomId).emit('recording-toggle', {
        socketId: socket.id,
        isRecording,
        recorderName: user?.displayName || user?.tag || 'Participant'
      });
    }
  });
}
