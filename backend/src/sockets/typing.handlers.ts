import { Socket } from 'socket.io';

export function registerTypingHandlers(
  socket: Socket,
  getCurrentRoomId: () => string | null,
  getUserProfile: () => any
) {
  socket.on('thread:typing', (isTyping: boolean) => {
    const roomId = getCurrentRoomId();
    const userProfile = getUserProfile();
    if (roomId && userProfile) {
      socket.to(roomId).emit('thread:typing', {
        tag: userProfile.tag,
        name: userProfile.displayName || userProfile.handle || 'Someone',
        isTyping
      });
    }
  });
}
