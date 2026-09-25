'use client';

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { RoomState, UserProfile } from '@/types';
import { getDeviceFingerprint } from '@/lib/fingerprint';

interface UseRoomProps {
  socket: Socket | null;
  roomId: string;
  user: UserProfile | null;
  password?: string;
  enabled?: boolean;
}

export function useRoom({ socket, roomId, user, password, enabled = true }: UseRoomProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [role, setRole] = useState<'active' | 'queue' | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = sessionStorage.getItem(`ct_role_${roomId}`);
      if (cached === 'active' || cached === 'queue') return cached;
    }
    return null;
  });
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [emojis, setEmojis] = useState<{ id: string; emoji: string; x: number; y: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Join Room
  useEffect(() => {
    if (!enabled || !socket || !roomId || !user) return;

    getDeviceFingerprint().then((fp) => {
      socket.emit('join-room', {
        roomId,
        userProfile: {
          tag: user.tag,
          displayName: user.handle,
          gender: user.gender,
          bio: user.bio,
          profilePicture: user.profilePicture,
          avatarType: user.avatarType || 'initials',
          avatarValue: user.avatarValue || '',
          accentColor: user.accentColor || 'cyber-purple',
          bubbleStyle: user.bubbleStyle || 'rounded',
          statusTag: user.statusTag || ''
        },
        password,
        fingerprint: fp
      });
    });

    const handleRoomState = (state: RoomState) => {
      setRoomState(state);
      const myActive = state.activeMembers.find(
        (m) => m.tag === user?.tag || (socket && m.socketId === socket.id)
      );
      if (myActive) {
        setRole('active');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`ct_role_${roomId}`, 'active');
        }
        if (myActive.isMuted) {
          setIsMuted(true);
        }
      } else {
        const inQueue = state.waitingQueue.find(
          (q) => q.tag === user?.tag || (socket && q.socketId === socket.id)
        );
        if (inQueue) {
          setRole('queue');
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(`ct_role_${roomId}`, 'queue');
          }
        }
      }
    };

    const handleRoleAssigned = ({ role: assignedRole }: { role: 'active' | 'queue' }) => {
      setRole(assignedRole);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`ct_role_${roomId}`, assignedRole);
      }
    };

    const handleModerationWarning = ({ message }: { message: string }) => {
      setToastMessage(`⚠️ ${message}`);
      setTimeout(() => setToastMessage(null), 5000);
    };

    const handlePeerMuteChanged = ({
      socketId,
      tag,
      isMuted: muted,
      isSpeaking
    }: {
      socketId?: string;
      tag?: string;
      isMuted: boolean;
      isSpeaking?: boolean;
    }) => {
      if ((tag && tag === user?.tag) || (socketId && socket && socketId === socket.id)) {
        if (muted) {
          setIsMuted(true);
        }
      }
      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activeMembers: prev.activeMembers.map((m) => {
            if ((tag && String(m.tag) === String(tag)) || (socketId && m.socketId === socketId)) {
              return {
                ...m,
                isMuted: muted,
                isSpeaking: typeof isSpeaking === 'boolean' ? isSpeaking : muted ? false : m.isSpeaking
              };
            }
            return m;
          })
        };
      });
    };

    socket.on('moderation-warning', handleModerationWarning);
    socket.on('peer-mute-changed', handlePeerMuteChanged);

    const handleEmoji = ({ emoji }: { emoji: string }) => {
      const id = Math.random().toString();
      const x = Math.random() * 80 + 10;
      const y = Math.random() * 60 + 20;
      setEmojis((prev) => [...prev, { id, emoji, x, y }]);
      setTimeout(() => {
        setEmojis((prev) => prev.filter((e) => e.id !== id));
      }, 2500);
    };

    const handleToast = ({ message }: { message: string }) => {
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 4000);
    };

    const handleActionError = ({ message }: { message: string }) => {
      setToastMessage(`⚠️ ${message}`);
      setTimeout(() => setToastMessage(null), 4000);
    };

    const handleJoinError = ({ message }: { message: string }) => {
      setError(message);
    };

    const handleRoomFull = () => {
      setError('Room has reached maximum capacity.');
    };

    const handleBanned = ({ message }: { message: string }) => {
      setError(message || 'You have been banned.');
    };

    socket.on('room-state-update', handleRoomState);
    socket.on('role-assigned', handleRoleAssigned);
    socket.on('room-emoji', handleEmoji);
    socket.on('removal-toast', handleToast);
    socket.on('action-error', handleActionError);
    socket.on('join-error', handleJoinError);
    socket.on('room-full', handleRoomFull);
    socket.on('banned', handleBanned);

    return () => {
      socket.off('moderation-warning', handleModerationWarning);
      socket.off('peer-mute-changed', handlePeerMuteChanged);
      socket.off('room-state-update', handleRoomState);
      socket.off('role-assigned', handleRoleAssigned);
      socket.off('room-emoji', handleEmoji);
      socket.off('removal-toast', handleToast);
      socket.off('action-error', handleActionError);
      socket.off('join-error', handleJoinError);
      socket.off('room-full', handleRoomFull);
      socket.off('banned', handleBanned);
      socket.emit('leave-room');
    };
  }, [socket, roomId, user?.tag, password, enabled]);

  // Live profile synchronization (e.g. re-rolled name, avatar changes) with room & stage
  useEffect(() => {
    if (!socket || !user?.handle || !roomId) return;

    socket.emit('update-profile', {
      roomId,
      handle: user.handle,
      avatarType: user.avatarType,
      avatarValue: user.avatarValue,
      accentColor: user.accentColor,
      bubbleStyle: user.bubbleStyle,
      statusTag: user.statusTag
    });

    setRoomState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        activeMembers: prev.activeMembers.map((m) => {
          if (String(m.tag) === String(user.tag) || (socket.id && m.socketId === socket.id)) {
            return {
              ...m,
              name: user.handle,
              displayName: user.handle,
              avatarType: user.avatarType || m.avatarType,
              avatarValue: user.avatarValue ?? m.avatarValue,
              accentColor: user.accentColor || m.accentColor,
              bubbleStyle: user.bubbleStyle || m.bubbleStyle,
              statusTag: user.statusTag ?? m.statusTag
            };
          }
          return m;
        }),
        waitingQueue: prev.waitingQueue.map((q) => {
          if (String(q.tag) === String(user.tag) || (socket.id && q.socketId === socket.id)) {
            return {
              ...q,
              name: user.handle,
              displayName: user.handle,
              avatarType: user.avatarType || q.avatarType,
              avatarValue: user.avatarValue ?? q.avatarValue,
              accentColor: user.accentColor || q.accentColor,
              bubbleStyle: user.bubbleStyle || q.bubbleStyle,
              statusTag: user.statusTag ?? q.statusTag
            };
          }
          return q;
        })
      };
    });
  }, [
    socket,
    roomId,
    user?.tag,
    user?.handle,
    user?.avatarType,
    user?.avatarValue,
    user?.accentColor,
    user?.bubbleStyle,
    user?.statusTag
  ]);

  // Also listen for ct-user-updated window event for instant cross-component sync
  useEffect(() => {
    const handleUserUpdatedEvent = (e: any) => {
      const updatedUser: UserProfile = e.detail;
      if (!updatedUser?.handle || !socket || !roomId) return;

      socket.emit('update-profile', {
        roomId,
        handle: updatedUser.handle,
        avatarType: updatedUser.avatarType,
        avatarValue: updatedUser.avatarValue,
        accentColor: updatedUser.accentColor,
        bubbleStyle: updatedUser.bubbleStyle,
        statusTag: updatedUser.statusTag
      });

      setRoomState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          activeMembers: prev.activeMembers.map((m) => {
            if (String(m.tag) === String(updatedUser.tag) || (socket.id && m.socketId === socket.id)) {
              return {
                ...m,
                name: updatedUser.handle,
                displayName: updatedUser.handle,
                avatarType: updatedUser.avatarType || m.avatarType,
                avatarValue: updatedUser.avatarValue ?? m.avatarValue,
                accentColor: updatedUser.accentColor || m.accentColor,
                bubbleStyle: updatedUser.bubbleStyle || m.bubbleStyle,
                statusTag: updatedUser.statusTag ?? m.statusTag
              };
            }
            return m;
          }),
          waitingQueue: prev.waitingQueue.map((q) => {
            if (String(q.tag) === String(updatedUser.tag) || (socket.id && q.socketId === socket.id)) {
              return {
                ...q,
                name: updatedUser.handle,
                displayName: updatedUser.handle,
                avatarType: updatedUser.avatarType || q.avatarType,
                avatarValue: updatedUser.avatarValue ?? q.avatarValue,
                accentColor: updatedUser.accentColor || q.accentColor,
                bubbleStyle: updatedUser.bubbleStyle || q.bubbleStyle,
                statusTag: updatedUser.statusTag ?? q.statusTag
              };
            }
            return q;
          })
        };
      });
    };

    window.addEventListener('ct-user-updated', handleUserUpdatedEvent);
    return () => {
      window.removeEventListener('ct-user-updated', handleUserUpdatedEvent);
    };
  }, [socket, roomId]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      socket?.emit('mute-toggle', { isMuted: next });
      return next;
    });
  }, [socket]);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => {
      const next = !prev;
      socket?.emit('video-toggle', { isVideoEnabled: next });
      return next;
    });
  }, [socket]);

  const setSpeaking = useCallback(
    (speaking: boolean) => {
      setIsSpeaking(speaking);
      socket?.emit('speaking-state', { isSpeaking: speaking });
    },
    [socket]
  );

  const toggleHand = useCallback(() => {
    socket?.emit('toggle-queue-hand');
  }, [socket]);

  const submitQuickComment = useCallback(
    (comment: string) => {
      socket?.emit('submit-quick-comment', { comment });
    },
    [socket]
  );

  const sendEmoji = useCallback(
    (emoji: string) => {
      socket?.emit('send-emoji', { emoji });
    },
    [socket]
  );

  const admitUser = useCallback(
    (targetSocketId?: string, targetTag?: string) => {
      socket?.emit('admit-user', { targetSocketId, targetTag });
    },
    [socket]
  );

  const removeUser = useCallback(
    (targetSocketId?: string, targetTag?: string) => {
      socket?.emit('remove-user', { targetSocketId, targetTag });
    },
    [socket]
  );

  const muteSpeaker = useCallback(
    (targetSocketId?: string, targetTag?: string) => {
      socket?.emit('mod-mute-speaker', { targetSocketId, targetTag });
    },
    [socket]
  );

  const myActiveMember = roomState?.activeMembers.find(
    (m) => m.tag === user?.tag || (socket && m.socketId === socket.id)
  );
  const myQueueMember = roomState?.waitingQueue.find(
    (q) => q.tag === user?.tag || (socket && q.socketId === socket.id)
  );

  const isMyModerator = !!(role === 'active' && myActiveMember?.isModerator);
  const isSeniorMod = !!(
    role === 'active' &&
    myActiveMember &&
    (roomState?.seniorModSocketId === myActiveMember.socketId || myActiveMember.isLead || myActiveMember.roleOnStage === 'lead')
  );
  const myQueueIndex = roomState?.waitingQueue.findIndex(
    (q) => q.tag === user?.tag || (socket && q.socketId === socket.id)
  );
  const myQueuePosition = myQueueIndex !== undefined && myQueueIndex !== -1 ? myQueueIndex + 1 : null;
  const isHandRaised = !!myQueueMember?.raisedHand;

  return {
    roomState,
    role,
    isMuted,
    isVideoEnabled,
    isSpeaking,
    toastMessage,
    emojis,
    error,
    isMyModerator,
    isSeniorMod,
    myActiveMember,
    myQueueMember,
    myQueuePosition,
    isHandRaised,
    toggleMute,
    toggleVideo,
    setSpeaking,
    toggleHand,
    submitQuickComment,
    sendEmoji,
    admitUser,
    removeUser,
    muteSpeaker
  };
}
