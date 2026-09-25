import { Server, Socket } from 'socket.io';
import {
  junctionRooms,
  getJunctionRoom,
  buildRoomStatePayload,
  isMemberModerator,
  popNextQueueMember,
  canDemoteTarget,
  canMuteTarget,
  getStageMemberRole
} from '../services/rooms.service.js';
import { User } from '../models/User.js';
import { MAX_STAGE_SLOTS, INITIAL_STAGE_SLOTS } from '../config/constants.js';
import { ActiveMember, QueueMember } from '../types/index.js';
import { generateRealisticName, resolveRoomDisplayName } from '../services/nameGenerator.service.js';
import { securityService } from '../services/security.service.js';

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  getCurrentRoomId: () => string | null,
  setCurrentRoomId: (id: string | null) => void,
  getUserProfile: () => any,
  setUserProfile: (profile: any) => void
) {
  function broadcastRoomState(roomId: string) {
    const payload = buildRoomStatePayload(roomId);
    if (payload) {
      io.to(roomId).emit('room-state-update', payload);
    }
  }

  function autoPopIfVacant(roomId: string) {
    const room = getJunctionRoom(roomId);
    if (!room) return;
    if (room.activeMembers.length < INITIAL_STAGE_SLOTS && room.waitingQueue.length > 0) {
      const popped = popNextQueueMember(roomId);
      if (popped) {
        if (popped.socketId) {
          io.to(popped.socketId).emit('role-assigned', { role: 'active' });
          const otherPeers = room.activeMembers.filter((m) => m.socketId !== popped.socketId);
          io.to(popped.socketId).emit('room-peers', { peers: otherPeers });
          io.to(roomId).emit('peer-joined', { peer: popped });
        }
        io.to(roomId).emit('removal-toast', {
          message: `🎙️ ${popped.displayName} was promoted to the active stage from the queue.`
        });
        broadcastRoomState(roomId);
      }
    }
  }

  function findBySocket(members: ActiveMember[], tag?: string) {
    return members.find(
      (m) => m.socketId === socket.id || (tag && String(m.tag) === String(tag))
    );
  }

  // User joins a voice room / junction debate
  socket.on('join-room', async ({ roomId, userProfile, password, fingerprint }: any) => {
    setCurrentRoomId(roomId);

    const clientIp = (socket.handshake.headers['x-forwarded-for'] as string) || socket.handshake.address || '127.0.0.1';
    const devFp = (fingerprint || userProfile?.fingerprint || socket.handshake.query?.fingerprint || socket.id) as string;
    socket.data.fingerprint = devFp;
    socket.data.joinedRoomAt = Date.now();

    const device = await securityService.getOrCreateDevice(devFp, clientIp, userProfile?.tag);
    if (device.isHardBanned) {
      socket.emit('banned', { message: 'Your device has been permanently banned from CockroachTalk.' });
      socket.disconnect(true);
      return;
    }

    if (userProfile?.tag) {
      try {
        const userRec = await User.findOne({ tag: String(userProfile.tag) });
        if (userRec && userRec.isBanned) {
          socket.emit('banned', { message: 'You have been banned from CockroachTalk.' });
          socket.disconnect(true);
          return;
        }
      } catch (err) {}
    }

    const room = getJunctionRoom(roomId);
    if (!room) {
      socket.emit('join-error', { message: 'This room does not exist or has expired.' });
      return;
    }

    if (room.isCustom && room.password && room.password !== password) {
      socket.emit('join-error', { message: 'Incorrect password.' });
      return;
    }

    const safeTag = userProfile?.tag || Math.floor(1000 + Math.random() * 9000).toString();
    const safeGender = userProfile?.gender || 'skip';
    const isSkipGender = !userProfile?.gender || userProfile.gender === 'skip' || userProfile.gender === 'prefer_not_to_say';
    let baseHandle = userProfile?.displayName || userProfile?.handle;
    if (isSkipGender && (!baseHandle || !baseHandle.startsWith('Cockroach #'))) {
      baseHandle = `Cockroach #${safeTag}`;
    }
    const rawName = baseHandle || generateRealisticName(userProfile?.gender, safeTag);

    // Check existing names in room to avoid collision
    const existingNamesInRoom = [
      ...room.activeMembers.filter((m) => String(m.tag) !== String(safeTag)).map((m) => m.displayName),
      ...room.waitingQueue.filter((q) => String(q.tag) !== String(safeTag)).map((q) => q.displayName)
    ];
    const safeName = resolveRoomDisplayName(rawName, existingNamesInRoom);

    const currentProfile: ActiveMember = {
      ...userProfile,
      displayName: safeName,
      tag: safeTag,
      gender: safeGender,
      socketId: socket.id,
      joinedActiveAt: Date.now(),
      isMuted: true,
      isSpeaking: false,
      isVideoEnabled: false,
      isScreenSharing: false,
      avatarType: userProfile?.avatarType || 'initials',
      avatarValue: userProfile?.avatarValue || '',
      accentColor: userProfile?.accentColor || 'cyber-purple',
      bubbleStyle: userProfile?.bubbleStyle || 'rounded',
      statusTag: userProfile?.statusTag || ''
    };

    setUserProfile(currentProfile);
    socket.join(roomId);

    const now = Date.now();

    // Check if user is already in activeMembers or waitingQueue (reconnect)
    const existingActive = room.activeMembers.find((m) => String(m.tag) === String(safeTag));
    const existingQueue = room.waitingQueue.find((q) => String(q.tag) === String(safeTag));

    if (existingActive) {
      existingActive.socketId = socket.id;
      existingActive.displayName = safeName;
      existingActive.gender = safeGender;
      existingActive.avatarType = userProfile?.avatarType || existingActive.avatarType || 'initials';
      existingActive.avatarValue = userProfile?.avatarValue ?? existingActive.avatarValue ?? '';
      existingActive.accentColor = userProfile?.accentColor || existingActive.accentColor || 'cyber-purple';
      existingActive.bubbleStyle = userProfile?.bubbleStyle || existingActive.bubbleStyle || 'rounded';
      existingActive.statusTag = userProfile?.statusTag ?? existingActive.statusTag ?? '';
      setUserProfile(existingActive);
      socket.emit('role-assigned', { role: 'active' });
    } else if (existingQueue) {
      existingQueue.socketId = socket.id;
      existingQueue.displayName = safeName;
      existingQueue.gender = safeGender;
      existingQueue.avatarType = userProfile?.avatarType || existingQueue.avatarType || 'initials';
      existingQueue.avatarValue = userProfile?.avatarValue ?? existingQueue.avatarValue ?? '';
      existingQueue.accentColor = userProfile?.accentColor || existingQueue.accentColor || 'cyber-purple';
      existingQueue.bubbleStyle = userProfile?.bubbleStyle || existingQueue.bubbleStyle || 'rounded';
      existingQueue.statusTag = userProfile?.statusTag ?? existingQueue.statusTag ?? '';
      setUserProfile(existingQueue);
      socket.emit('role-assigned', { role: 'queue' });
    } else {
      const totalRoomUsers = room.activeMembers.length + room.waitingQueue.length;
      if (totalRoomUsers >= MAX_STAGE_SLOTS) {
        socket.emit('room-full', { maxCapacity: MAX_STAGE_SLOTS });
        return;
      }

      if (room.activeMembers.length < INITIAL_STAGE_SLOTS) {
        currentProfile.joinedActiveAt = now;
        currentProfile.removalsCount = 0;
        room.activeMembers.push(currentProfile);
        socket.emit('role-assigned', { role: 'active' });
      } else {
        const queueItem: QueueMember = {
          socketId: socket.id,
          tag: safeTag,
          displayName: safeName,
          gender: safeGender,
          joinedWaitAt: now,
          raisedHand: false,
          quickComment: null,
          commentUsed: false,
          avatarType: userProfile?.avatarType || 'initials',
          avatarValue: userProfile?.avatarValue || '',
          accentColor: userProfile?.accentColor || 'cyber-purple',
          bubbleStyle: userProfile?.bubbleStyle || 'rounded',
          statusTag: userProfile?.statusTag || ''
        };
        room.waitingQueue.push(queueItem);
        setUserProfile(queueItem);
        socket.emit('role-assigned', { role: 'queue' });
      }
    }

    // Send active peer list for WebRTC mesh signaling if active
    const isActiveUser = room.activeMembers.some((m) => m.socketId === socket.id);
    if (isActiveUser) {
      const existingPeers = room.activeMembers.filter((p) => p.socketId !== socket.id);
      socket.emit('room-peers', { peers: existingPeers });
      socket.to(roomId).emit('peer-joined', { peer: currentProfile });
    }
    broadcastRoomState(roomId);
  });

  // Mute / Unmute Toggle
  socket.on('mute-toggle', ({ isMuted }: { isMuted: boolean }) => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();
    if (profile && roomId) {
      const room = getJunctionRoom(roomId);
      if (room) {
        const member = findBySocket(room.activeMembers, profile.tag);
        if (member) {
          member.isMuted = isMuted;
          if (isMuted) member.isSpeaking = false;
          io.to(roomId).emit('peer-mute-changed', {
            socketId: socket.id,
            tag: profile.tag,
            isMuted,
            isSpeaking: member.isSpeaking
          });
          broadcastRoomState(roomId);
        }
      }
    }
  });

  // Video Toggle
  socket.on('video-toggle', ({ isVideoEnabled }: { isVideoEnabled: boolean }) => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();
    if (profile && roomId) {
      const room = getJunctionRoom(roomId);
      if (room) {
        const member = findBySocket(room.activeMembers, profile.tag);
        if (member) {
          member.isVideoEnabled = isVideoEnabled;
          broadcastRoomState(roomId);
        }
      }
    }
  });

  // Screen Share Toggle
  socket.on('screen-share-toggle', ({ isScreenSharing }: { isScreenSharing: boolean }) => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();
    if (profile && roomId) {
      const room = getJunctionRoom(roomId);
      if (room) {
        const member = findBySocket(room.activeMembers, profile.tag);
        if (member) {
          member.isScreenSharing = isScreenSharing;
          broadcastRoomState(roomId);
        }
      }
    }
  });

  // Dynamic Speaking State
  socket.on('speaking-state', ({ isSpeaking }: { isSpeaking: boolean }) => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();
    if (profile && roomId) {
      const room = getJunctionRoom(roomId);
      if (room) {
        const member = findBySocket(room.activeMembers, profile.tag);
        if (member && !member.isMuted) {
          member.isSpeaking = isSpeaking;
          io.to(roomId).emit('peer-mute-changed', {
            socketId: socket.id,
            tag: profile.tag,
            isMuted: member.isMuted,
            isSpeaking: member.isSpeaking
          });
        }
      }
    }
  });

  // Toggle Raise Hand in Queue
  socket.on('toggle-queue-hand', () => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();
    if (!roomId) return;
    const room = getJunctionRoom(roomId);
    if (!room) return;

    const queueItem = room.waitingQueue.find(
      (q) => q.socketId === socket.id || (profile && String(q.tag) === String(profile.tag))
    );
    if (queueItem) {
      queueItem.raisedHand = !queueItem.raisedHand;
      broadcastRoomState(roomId);
    }
  });

  // Submit Quick Comment (max 30 chars)
  socket.on('submit-quick-comment', async ({ comment }: { comment: string }) => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();
    if (!roomId || typeof comment !== 'string') return;
    const room = getJunctionRoom(roomId);
    if (!room) return;

    const clientIp = (socket.handshake.headers['x-forwarded-for'] as string) || socket.handshake.address || '127.0.0.1';
    const devFp = (socket.data?.fingerprint || profile?.fingerprint || socket.id) as string;

    const evalResult = await securityService.evaluateMessage({
      fingerprint: devFp,
      ip: clientIp,
      tag: profile?.tag,
      text: comment,
      roomId,
      joinTimestamp: socket.data?.joinedRoomAt
    });

    if (!evalResult.allowed) {
      socket.emit('moderation-warning', {
        message: evalResult.message || 'Comment blocked by moderation filter.',
        penalty: evalResult.actionTaken
      });
      return;
    }

    const queueItem = room.waitingQueue.find(
      (q) => q.socketId === socket.id || (profile && String(q.tag) === String(profile.tag))
    );
    const activeItem = room.activeMembers.find(
      (m) => m.socketId === socket.id || (profile && String(m.tag) === String(profile.tag))
    );

    const target = queueItem || activeItem;
    if (target) {
      target.quickComment = comment.trim().substring(0, 30);
      target.commentUsed = true;
      if (evalResult.isShadowBanned) {
        // Shadow ban: echo update only to the sender socket
        const senderPayload = buildRoomStatePayload(roomId);
        if (senderPayload) socket.emit('room-state-update', senderPayload);
      } else {
        broadcastRoomState(roomId);
      }
    }
  });

  // Relay Emoji Reactions
  socket.on('send-emoji', ({ emoji }: { emoji: string }) => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();
    if (roomId && emoji) {
      io.to(roomId).emit('room-emoji', {
        socketId: socket.id,
        tag: profile?.tag,
        emoji
      });
    }
  });

  // Relay Chat Messages with Automated Moderation & Shadow-Banning
  socket.on('send-chat-message', async ({ text }: { text: string }) => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();
    if (!roomId || typeof text !== 'string' || text.trim().length === 0) return;

    const clientIp = (socket.handshake.headers['x-forwarded-for'] as string) || socket.handshake.address || '127.0.0.1';
    const devFp = (socket.data?.fingerprint || profile?.fingerprint || socket.id) as string;

    const evalResult = await securityService.evaluateMessage({
      fingerprint: devFp,
      ip: clientIp,
      tag: profile?.tag,
      text,
      roomId,
      joinTimestamp: socket.data?.joinedRoomAt
    });

    if (!evalResult.allowed) {
      if (evalResult.actionTaken === 'hard_ban') {
        socket.emit('banned', { message: evalResult.message || 'You have been banned from CockroachTalk.' });
        socket.disconnect(true);
      } else {
        socket.emit('moderation-warning', {
          message: evalResult.message || 'Message blocked by automated moderation.',
          penalty: evalResult.actionTaken,
          reason: evalResult.reason
        });
      }
      return;
    }

    const messagePayload = {
      socketId: socket.id,
      tag: profile?.tag,
      name: profile?.displayName || profile?.handle || 'Anonymous',
      avatarType: profile?.avatarType || 'initials',
      avatarValue: profile?.avatarValue || '',
      accentColor: profile?.accentColor || 'cyber-purple',
      bubbleStyle: profile?.bubbleStyle || 'rounded',
      statusTag: profile?.statusTag || '',
      text: text.trim().substring(0, 500),
      timestamp: Date.now()
    };

    if (evalResult.isShadowBanned) {
      // SHADOW BAN: Echo exclusively to sender, omit from room broadcast
      socket.emit('room-chat-message', messagePayload);
    } else {
      io.to(roomId).emit('room-chat-message', messagePayload);
    }
  });

  // Client Updates Profile Live (Propagate to Active Members, Queue, and Room)
  socket.on(
    'update-profile',
    (updatedData: {
      roomId?: string;
      handle?: string;
      avatarType?: 'initials' | 'identicon' | 'emoji';
      avatarValue?: string;
      accentColor?: string;
      bubbleStyle?: 'sharp' | 'rounded' | 'outline';
      statusTag?: string;
    }) => {
      const activeRoomId = updatedData.roomId || getCurrentRoomId();
      let profile = getUserProfile();

      if (!profile && activeRoomId && junctionRooms.has(activeRoomId)) {
        const room = junctionRooms.get(activeRoomId)!;
        profile = room.activeMembers.find((m) => m.socketId === socket.id) ||
                  room.waitingQueue.find((q) => q.socketId === socket.id);
      }

      if (profile) {
        if (updatedData.handle) profile.displayName = updatedData.handle;
        if (updatedData.avatarType) profile.avatarType = updatedData.avatarType;
        if (updatedData.avatarValue !== undefined) profile.avatarValue = updatedData.avatarValue;
        if (updatedData.accentColor) profile.accentColor = updatedData.accentColor;
        if (updatedData.bubbleStyle) profile.bubbleStyle = updatedData.bubbleStyle;
        if (updatedData.statusTag !== undefined) profile.statusTag = updatedData.statusTag;
        setUserProfile(profile);
      }

      if (activeRoomId && junctionRooms.has(activeRoomId)) {
        const room = junctionRooms.get(activeRoomId)!;
        const activeMem = room.activeMembers.find(
          (m) => m.socketId === socket.id || (profile && String(m.tag) === String(profile.tag))
        );
        if (activeMem) {
          if (updatedData.handle) activeMem.displayName = updatedData.handle;
          if (updatedData.avatarType) activeMem.avatarType = updatedData.avatarType;
          if (updatedData.avatarValue !== undefined) activeMem.avatarValue = updatedData.avatarValue;
          if (updatedData.accentColor) activeMem.accentColor = updatedData.accentColor;
          if (updatedData.bubbleStyle) activeMem.bubbleStyle = updatedData.bubbleStyle;
          if (updatedData.statusTag !== undefined) activeMem.statusTag = updatedData.statusTag;
        }

        const queueMem = room.waitingQueue.find(
          (q) => q.socketId === socket.id || (profile && String(q.tag) === String(profile.tag))
        );
        if (queueMem) {
          if (updatedData.handle) queueMem.displayName = updatedData.handle;
          if (updatedData.avatarType) queueMem.avatarType = updatedData.avatarType;
          if (updatedData.avatarValue !== undefined) queueMem.avatarValue = updatedData.avatarValue;
          if (updatedData.accentColor) queueMem.accentColor = updatedData.accentColor;
          if (updatedData.bubbleStyle) queueMem.bubbleStyle = updatedData.bubbleStyle;
          if (updatedData.statusTag !== undefined) queueMem.statusTag = updatedData.statusTag;
        }

        broadcastRoomState(activeRoomId);
        io.to(activeRoomId).emit('user-profile-updated', {
          socketId: socket.id,
          tag: profile?.tag || activeMem?.tag || queueMem?.tag,
          ...updatedData
        });
      }
    }
  );

  // Moderator Admits a Waiting Queue User to Active Stage
  socket.on('admit-user', ({ targetSocketId, targetTag }: { targetSocketId?: string; targetTag?: string }) => {
    let roomId = getCurrentRoomId();
    const profile = getUserProfile();

    if (!roomId) {
      for (const [rId, rData] of junctionRooms.entries()) {
        if (
          rData.activeMembers.some(
            (m) => m.socketId === socket.id || (profile && String(m.tag) === String(profile.tag))
          )
        ) {
          roomId = rId;
          break;
        }
      }
    }

    if (!roomId) return;
    const room = getJunctionRoom(roomId);
    if (!room) return;

    const now = Date.now();
    const requester = room.activeMembers.find(
      (m) => m.socketId === socket.id || (profile && String(m.tag) === String(profile.tag))
    );
    const isRequesterMod = isMemberModerator(requester || null, room.activeMembers, now);

    if (!requester || !isRequesterMod) {
      socket.emit('action-error', {
        message: 'Only Stage Moderators can admit waiting users.'
      });
      return;
    }

    const queueIdx = room.waitingQueue.findIndex(
      (q) =>
        (targetSocketId && q.socketId === targetSocketId) ||
        (targetTag && String(q.tag) === String(targetTag))
    );

    if (queueIdx === -1) {
      socket.emit('action-error', { message: 'User is no longer in the waiting queue.' });
      return;
    }

    if (room.activeMembers.length >= MAX_STAGE_SLOTS) {
      socket.emit('action-error', {
        message: `Active Stage is full (${MAX_STAGE_SLOTS}/${MAX_STAGE_SLOTS} participants).`
      });
      return;
    }

    const admittedUser = room.waitingQueue[queueIdx];
    const admittedTag = String(admittedUser.tag || targetTag);
    const targetSock = admittedUser.socketId || targetSocketId;

    room.waitingQueue = room.waitingQueue.filter(
      (q) => String(q.tag) !== admittedTag && (!targetSock || q.socketId !== targetSock)
    );

    const activeMember: ActiveMember = {
      socketId: admittedUser.socketId,
      tag: admittedUser.tag,
      displayName: admittedUser.displayName,
      gender: admittedUser.gender,
      joinedActiveAt: now,
      removalsCount: 0,
      isMuted: true,
      isSpeaking: false,
      isVideoEnabled: false,
      isScreenSharing: false
    };

    room.activeMembers.push(activeMember);

    if (activeMember.socketId) {
      io.to(activeMember.socketId).emit('role-assigned', { role: 'active' });
      const otherPeers = room.activeMembers.filter((m) => m.socketId !== activeMember.socketId);
      io.to(activeMember.socketId).emit('room-peers', { peers: otherPeers });
      io.to(roomId).emit('peer-joined', { peer: activeMember });
    }

    const modName = requester.displayName || 'Moderator';
    const userName = activeMember.displayName || 'Participant';
    io.to(roomId).emit('removal-toast', { message: `🎙️ ${modName} admitted ${userName} to the stage.` });

    broadcastRoomState(roomId);
  });

  // Moderator Removes an Active Member to Waiting Queue
  socket.on('remove-user', ({ targetSocketId, targetTag }: { targetSocketId?: string; targetTag?: string }) => {
    let roomId = getCurrentRoomId();
    const profile = getUserProfile();

    if (!roomId) {
      for (const [rId, rData] of junctionRooms.entries()) {
        if (
          rData.activeMembers.some(
            (m) => m.socketId === socket.id || (profile && String(m.tag) === String(profile.tag))
          )
        ) {
          roomId = rId;
          break;
        }
      }
    }

    if (!roomId) return;
    const room = getJunctionRoom(roomId);
    if (!room) return;

    const now = Date.now();
    const requester = room.activeMembers.find(
      (m) => m.socketId === socket.id || (profile && String(m.tag) === String(profile.tag))
    );
    const isRequesterMod = isMemberModerator(requester || null, room.activeMembers, now);

    if (!requester || !isRequesterMod) {
      socket.emit('action-error', {
        message: 'Only Stage Moderators can remove debaters.'
      });
      return;
    }

    if (
      targetSocketId === socket.id ||
      (targetTag && profile && String(targetTag) === String(profile.tag))
    ) {
      socket.emit('action-error', { message: 'You cannot demote yourself.' });
      return;
    }

    const activeIdx = room.activeMembers.findIndex(
      (m) =>
        (targetSocketId && m.socketId === targetSocketId) ||
        (targetTag && String(m.tag) === String(targetTag))
    );

    if (activeIdx === -1) {
      socket.emit('action-error', { message: 'User is no longer on the active stage.' });
      return;
    }

    const removedUser = room.activeMembers[activeIdx];
    const canDemote = canDemoteTarget(requester || null, removedUser, room.activeMembers, now);
    if (!canDemote.allowed) {
      socket.emit('action-error', {
        message: canDemote.reason || 'You do not have permission to demote this member.'
      });
      return;
    }

    const remTag = String(removedUser.tag || targetTag);

      room.activeMembers = room.activeMembers.filter(
        (m) => String(m.tag) !== remTag && (!targetSocketId || m.socketId !== targetSocketId)
      );
      room.waitingQueue = room.waitingQueue.filter((q) => String(q.tag) !== remTag);

      const queueMember: QueueMember = {
        socketId: removedUser.socketId,
        tag: removedUser.tag,
        displayName: removedUser.displayName,
        gender: removedUser.gender,
        joinedWaitAt: now,
        raisedHand: false,
        quickComment: null,
        commentUsed: false
      };

      room.waitingQueue.push(queueMember);

      if (queueMember.socketId) {
        io.to(queueMember.socketId).emit('role-assigned', { role: 'queue' });
        io.to(roomId).emit('peer-left', { socketId: queueMember.socketId, tag: remTag });
      }

      const modName = requester.displayName || 'Moderator';
      const userName = queueMember.displayName || 'Participant';
      io.to(roomId).emit('removal-toast', {
        message: `↩️ ${modName} moved ${userName} to the waiting queue.`
      });
      broadcastRoomState(roomId);

      // Auto-pop the next waiting queue member if active stage is now below initial slots
      autoPopIfVacant(roomId);
  });

  // Voluntary step-down is disabled per stage rules: only Lead or Mods can demote members to queue
  socket.on('step-down-to-queue', () => {
    socket.emit('action-error', {
      message: 'Self-demotion is not allowed. Only the Room Lead or Moderators can demote participants to the queue.'
    });
  });

  // Moderator Force-Mutes an Active Speaker
  socket.on('mod-mute-speaker', ({ targetSocketId, targetTag }: { targetSocketId?: string; targetTag?: string }) => {
    let roomId = getCurrentRoomId();
    const profile = getUserProfile();

    if (!roomId) {
      for (const [rId, rData] of junctionRooms.entries()) {
        if (
          rData.activeMembers.some(
            (m) => m.socketId === socket.id || (profile && String(m.tag) === String(profile.tag))
          )
        ) {
          roomId = rId;
          break;
        }
      }
    }

    if (!roomId) return;
    const room = getJunctionRoom(roomId);
    if (!room) return;

    const now = Date.now();
    const requester = room.activeMembers.find(
      (m) => m.socketId === socket.id || (profile && String(m.tag) === String(profile.tag))
    );

    if (!requester) {
      socket.emit('action-error', {
        message: 'Only speakers on stage can mute participants.'
      });
      return;
    }

    const target = room.activeMembers.find(
      (m) => (targetSocketId && m.socketId === targetSocketId) || (targetTag && String(m.tag) === String(targetTag))
    );

    if (!target) {
      socket.emit('action-error', { message: 'User is no longer on the active stage.' });
      return;
    }

    const canMute = canMuteTarget(requester, target, room.activeMembers, now);
    if (!canMute.allowed) {
      socket.emit('action-error', {
        message: canMute.reason || 'You do not have permission to mute this member.'
      });
      return;
    }

    target.isMuted = true;
    target.isSpeaking = false;

    if (target.socketId) {
      const requesterRole = getStageMemberRole(requester, room.activeMembers, now);
      const roleLabel =
        requesterRole === 'lead'
          ? 'the Room Lead'
          : requesterRole === 'mod'
          ? 'a Stage Moderator'
          : 'a stage speaker';
      io.to(target.socketId).emit('moderation-warning', {
        message: `Your microphone was muted by ${requester.displayName ? `${requester.displayName} (${roleLabel})` : roleLabel}.`
      });
    }

    io.to(roomId).emit('peer-mute-changed', {
      socketId: target.socketId,
      tag: target.tag,
      isMuted: true,
      isSpeaking: false
    });

    const muterName = requester.displayName || 'A speaker';
    const userName = target.displayName || 'Participant';
    io.to(roomId).emit('removal-toast', {
      message: `🔇 ${muterName} muted ${userName}.`
    });

    broadcastRoomState(roomId);
  });

  // Explicit Leave
  socket.on('leave-room', () => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();
    if (roomId && junctionRooms.has(roomId)) {
      const room = junctionRooms.get(roomId)!;
      const tag = profile?.tag;

      const wasActive = room.activeMembers.some(
        (m) => m.socketId === socket.id || (tag && String(m.tag) === String(tag))
      );

      room.activeMembers = room.activeMembers.filter(
        (m) => m.socketId !== socket.id && (!tag || String(m.tag) !== String(tag))
      );
      room.waitingQueue = room.waitingQueue.filter(
        (q) => q.socketId !== socket.id && (!tag || String(q.tag) !== String(tag))
      );

      socket.to(roomId).emit('peer-left', { socketId: socket.id, tag });
      socket.leave(roomId);
      broadcastRoomState(roomId);

      if (wasActive) {
        autoPopIfVacant(roomId);
      }
    }
  });

  // Handle Disconnect with 15s Reconnection Grace Period
  socket.on('disconnect', () => {
    const roomId = getCurrentRoomId();
    const profile = getUserProfile();

    if (roomId && junctionRooms.has(roomId)) {
      const room = junctionRooms.get(roomId)!;
      const tagToCleanup = profile?.tag;
      const sockIdToCleanup = socket.id;

      socket.to(roomId).emit('peer-left', { socketId: sockIdToCleanup, tag: tagToCleanup });
      socket.leave(roomId);

      setTimeout(() => {
        if (!tagToCleanup) return;
        const currentJunctionRoom = junctionRooms.get(roomId);
        if (!currentJunctionRoom) return;

        const activeItem = currentJunctionRoom.activeMembers.find(
          (m) => String(m.tag) === String(tagToCleanup)
        );
        const queueItem = currentJunctionRoom.waitingQueue.find(
          (q) => String(q.tag) === String(tagToCleanup)
        );

        const isReconnected =
          (activeItem && activeItem.socketId !== sockIdToCleanup) ||
          (queueItem && queueItem.socketId !== sockIdToCleanup);

        if (!isReconnected) {
          const wasActive = currentJunctionRoom.activeMembers.some(
            (m) => m.socketId === sockIdToCleanup || String(m.tag) === String(tagToCleanup)
          );

          currentJunctionRoom.activeMembers = currentJunctionRoom.activeMembers.filter(
            (m) => m.socketId !== sockIdToCleanup && String(m.tag) !== String(tagToCleanup)
          );
          currentJunctionRoom.waitingQueue = currentJunctionRoom.waitingQueue.filter(
            (q) => q.socketId !== sockIdToCleanup && String(q.tag) !== String(tagToCleanup)
          );
          broadcastRoomState(roomId);

          if (wasActive) {
            autoPopIfVacant(roomId);
          }
        }
      }, 15000);
    }
  });
}
