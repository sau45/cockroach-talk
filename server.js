/**
 * CockroachTalk - Node.js Express Server + Socket.io WebRTC Signaling + MongoDB API
 * File Responsibility: Serves static files, manages MongoDB user IDs, deduplicates same-user tag connections, and routes real-time WebRTC audio signaling.
 */

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';
import { MongoClient } from 'mongodb';
import { SPECIES_LIST } from './js/config.js';

// Force Google Public DNS for SRV record resolution on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Fallback if DNS server override fails
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Global user state variables
let memoryCounter = 1001;
let usersCollection = null;

// Initialize MongoDB Connection if MONGODB_URI is specified
if (process.env.MONGODB_URI) {
  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  mongoClient.connect().then(() => {
    const db = mongoClient.db(process.env.MONGODB_DB || 'cockroachtalk');
    usersCollection = db.collection('users');
    console.log('✅ MongoDB connected for CockroachTalk user management.');
  }).catch((err) => {
    console.warn('⚠️ MongoDB connection warning:', err.message);
  });
}

// Track Junction Debate rooms (roomId -> { activeMembers: [], waitingQueue: [] })
const junctionRooms = new Map();
const MAX_STAGE_SLOTS = 8;
const INITIAL_STAGE_SLOTS = 2;

function getJunctionRoom(roomId) {
  if (!junctionRooms.has(roomId)) {
    junctionRooms.set(roomId, { activeMembers: [], waitingQueue: [] });
  }
  return junctionRooms.get(roomId);
}

const MODERATOR_WAIT_TIME_MS = 1 * 60 * 1000; // 10 minutes wait time to become a moderator

function getModeratorSocketsAndTags(activeMembers, now = Date.now(), capacity = MAX_STAGE_SLOTS) {
  const maxMods = Math.floor(capacity / 2); // Half of total capacity (4 for capacity 8)

  // Eligible active members: spent at least 10 minutes on active stage
  const eligible = activeMembers
    .filter(m => m.joinedActiveAt && (now - m.joinedActiveAt) >= MODERATOR_WAIT_TIME_MS)
    .sort((a, b) => (a.joinedActiveAt || 0) - (b.joinedActiveAt || 0)); // Earliest joined first

  const modSockets = new Set();
  const modTags = new Set();

  for (let i = 0; i < Math.min(eligible.length, maxMods); i++) {
    const member = eligible[i];
    if (member.socketId) modSockets.add(member.socketId);
    if (member.tag) modTags.add(String(member.tag));
  }

  return { modSockets, modTags };
}

function isMemberModerator(member, activeMembers, now = Date.now(), capacity = MAX_STAGE_SLOTS) {
  if (!member) return false;
  const { modSockets, modTags } = getModeratorSocketsAndTags(activeMembers, now, capacity);
  return (member.socketId && modSockets.has(member.socketId)) || (member.tag && modTags.has(String(member.tag)));
}

function buildRoomStatePayload(roomId, now = Date.now()) {
  const room = getJunctionRoom(roomId);
  const { modSockets, modTags } = getModeratorSocketsAndTags(room.activeMembers, now, MAX_STAGE_SLOTS);

  const activeMembers = room.activeMembers.map(m => {
    const isMod = (m.socketId && modSockets.has(m.socketId)) || (m.tag && modTags.has(String(m.tag)));
    return {
      socketId: m.socketId,
      tag: m.tag,
      name: m.displayName,
      gender: m.gender,
      joinedActiveAt: m.joinedActiveAt,
      activeTimeMs: now - m.joinedActiveAt,
      isModerator: !!isMod,
      isMuted: m.isMuted,
      isSpeaking: m.isSpeaking
    };
  });

  const waitingQueue = room.waitingQueue.map(q => {
    const waitTimeMs = now - q.joinedWaitAt;
    return {
      socketId: q.socketId,
      tag: q.tag,
      name: q.displayName,
      gender: q.gender,
      joinedWaitAt: q.joinedWaitAt,
      waitTimeMs: waitTimeMs,
      canComment: !q.commentUsed,
      raisedHand: !!q.raisedHand,
      quickComment: q.quickComment || null,
      commentUsed: !!q.commentUsed
    };
  });

  return {
    roomId,
    activeMembers,
    waitingQueue,
    seniorModSocketId: null,
    capacity: MAX_STAGE_SLOTS
  };
}

function broadcastRoomState(roomId) {
  const payload = buildRoomStatePayload(roomId);
  io.to(roomId).emit('room-state-update', payload);
}

// Periodic tick every 5 seconds to update timers for active members and waiting queue
setInterval(() => {
  for (const roomId of junctionRooms.keys()) {
    const room = junctionRooms.get(roomId);
    if (room.activeMembers.length > 0 || room.waitingQueue.length > 0) {
      broadcastRoomState(roomId);
    }
  }
}, 5000);

/**
 * GET /api/rooms - Deduplicated active participant metrics for all State Cockroach rooms
 */
app.get('/api/rooms', (req, res) => {
  const rooms = SPECIES_LIST.map((sp) => {
    const jRoom = junctionRooms.get(sp.id);
    const activeCount = jRoom ? jRoom.activeMembers.length : 0;
    const waitingCount = jRoom ? jRoom.waitingQueue.length : 0;

    return {
      id: sp.id,
      name: sp.name,
      topic: `${sp.name} live debate & voice junction`,
      listeners: activeCount + waitingCount,
      speakerCount: activeCount,
      waitingCount: waitingCount,
      isLive: (activeCount + waitingCount) > 0,
      speakers: jRoom ? jRoom.activeMembers.map(u => ({
        id: u.socketId,
        tag: u.tag,
        name: u.displayName,
        gender: u.gender || 'skip',
        isSpeaking: u.isSpeaking || false
      })) : []
    };
  });
  res.json(rooms);
});

/**
 * GET /api/unique-id
 */
app.get('/api/unique-id', async (req, res) => {
  try {
    let nextId = null;

    if (usersCollection) {
      const lastUser = await usersCollection.find().sort({ tagNum: -1 }).limit(1).toArray();
      const lastTagNum = (lastUser.length > 0 && lastUser[0].tagNum) ? lastUser[0].tagNum : 1000;
      const newTagNum = lastTagNum + 1;
      nextId = newTagNum.toString();

      await usersCollection.insertOne({
        tag: nextId,
        tagNum: newTagNum,
        handle: `Cockroach #${nextId}`,
        createdAt: new Date(),
        lastActiveAt: new Date()
      });
    } else {
      nextId = memoryCounter.toString();
      memoryCounter++;
    }

    res.json({
      tag: nextId,
      handle: `Cockroach #${nextId}`
    });
  } catch (error) {
    console.error('Error generating unique ID:', error);
    const fallbackTag = Math.floor(1000 + Math.random() * 9000).toString();
    res.json({ tag: fallbackTag, handle: `Cockroach #${fallbackTag}` });
  }
});

/**
 * POST /api/heartbeat
 */
app.post('/api/heartbeat', async (req, res) => {
  try {
    const { tag } = req.body;
    if (usersCollection && tag) {
      await usersCollection.updateOne(
        { tag: String(tag) },
        { $set: { lastActiveAt: new Date() } }
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
});

/**
 * POST /api/leave-room
 * Immediately removes a user (by tag) from a room's active stage and waiting queue.
 * Called by the junctions page when the user confirms switching junctions, so the
 * previous room is updated instantly without waiting for the 15-second socket grace period.
 */
app.post('/api/leave-room', (req, res) => {
  const { roomId, tag } = req.body;
  if (!roomId || !tag) {
    return res.status(400).json({ success: false, message: 'Missing roomId or tag' });
  }

  const room = junctionRooms.get(roomId);
  if (!room) {
    return res.json({ success: true, message: 'Room not found (already clean)' });
  }

  const safeTag = String(tag);
  const hadActive = room.activeMembers.some(m => String(m.tag) === safeTag);
  const hadQueue = room.waitingQueue.some(q => String(q.tag) === safeTag);

  room.activeMembers = room.activeMembers.filter(m => String(m.tag) !== safeTag);
  room.waitingQueue = room.waitingQueue.filter(q => String(q.tag) !== safeTag);

  if (hadActive || hadQueue) {
    broadcastRoomState(roomId);
    console.log(`[API] /api/leave-room: tag #${safeTag} removed from room "${roomId}".`);
  }

  res.json({ success: true });
});

// Real-Time Socket.io WebRTC Audio Room Signaling & Junction Debate State
io.on('connection', (socket) => {
  let currentRoomId = null;
  let currentUserProfile = null;

  // Helper: find room member by socket.id or tag
  function findBySocket(members, tag) {
    return members.find(m => m.socketId === socket.id || (tag && String(m.tag) === String(tag)));
  }

  // User joins a voice room / junction debate
  socket.on('join-room', ({ roomId, userProfile }) => {
    currentRoomId = roomId;

    const safeTag = userProfile?.tag || Math.floor(1000 + Math.random() * 9000).toString();
    const safeName = userProfile?.displayName || `Cockroach #${safeTag}`;
    const safeGender = userProfile?.gender || 'skip';

    currentUserProfile = {
      ...userProfile,
      displayName: safeName,
      tag: safeTag,
      gender: safeGender,
      socketId: socket.id,
      isMuted: true,
      isSpeaking: false
    };

    socket.join(roomId);

    const room = getJunctionRoom(roomId);
    const now = Date.now();

    // Check if user is already in activeMembers or waitingQueue (e.g. page refresh / reconnect)
    let existingActive = room.activeMembers.find(m => String(m.tag) === String(safeTag));
    let existingQueue = room.waitingQueue.find(q => String(q.tag) === String(safeTag));

    if (existingActive) {
      // Reconnect: re-attach existing active debater with new socket
      existingActive.socketId = socket.id;
      existingActive.displayName = safeName;
      existingActive.gender = safeGender;
      currentUserProfile = existingActive;
      socket.emit('role-assigned', { role: 'active' });
      console.log(`[Room] "${safeName}" (#${safeTag}) RECONNECTED as active debater.`);
    } else if (existingQueue) {
      // Reconnect: re-attach existing queue user with new socket
      existingQueue.socketId = socket.id;
      existingQueue.displayName = safeName;
      existingQueue.gender = safeGender;
      currentUserProfile = existingQueue;
      socket.emit('role-assigned', { role: 'queue' });
      console.log(`[Room] "${safeName}" (#${safeTag}) RECONNECTED in waiting queue.`);
    } else {
      // New user entry for this room
      if (room.activeMembers.length < INITIAL_STAGE_SLOTS) {
        currentUserProfile.joinedActiveAt = now;
        currentUserProfile.removalsCount = 0;
        room.activeMembers.push(currentUserProfile);
        socket.emit('role-assigned', { role: 'active' });
        console.log(`[Room] "${currentUserProfile.displayName}" joined ACTIVE STAGE (${room.activeMembers.length}/${MAX_STAGE_SLOTS}).`);
      } else {
        currentUserProfile.joinedWaitAt = now;
        currentUserProfile.raisedHand = false;
        currentUserProfile.quickComment = null;
        currentUserProfile.commentUsed = false;
        room.waitingQueue.push(currentUserProfile);
        socket.emit('role-assigned', { role: 'queue' });
        console.log(`[Room] "${currentUserProfile.displayName}" joined WAITING QUEUE (pos ${room.waitingQueue.length}).`);
      }
    }

    // Send active peer list for WebRTC mesh signaling
    const existingPeers = room.activeMembers.filter(p => p.socketId !== socket.id);
    socket.emit('room-peers', { peers: existingPeers });
    broadcastRoomState(roomId);
  });

  // Relay WebRTC Offer
  socket.on('signal-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('signal-offer', {
      senderSocketId: socket.id,
      offer,
      senderProfile: currentUserProfile
    });
  });

  // Relay WebRTC Answer
  socket.on('signal-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('signal-answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  // Relay WebRTC ICE Candidate
  socket.on('signal-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('signal-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // Mute / Unmute Toggle
  socket.on('mute-toggle', ({ isMuted }) => {
    if (currentUserProfile && currentRoomId) {
      const room = getJunctionRoom(currentRoomId);
      const member = findBySocket(room.activeMembers, currentUserProfile.tag);
      if (member) {
        member.isMuted = isMuted;
        member.isSpeaking = !isMuted;
        io.to(currentRoomId).emit('peer-mute-changed', {
          socketId: socket.id,
          tag: currentUserProfile.tag,
          isMuted,
          isSpeaking: !isMuted
        });
      }
    }
  });

  // Toggle Raise Hand in Queue
  socket.on('toggle-queue-hand', () => {
    if (!currentRoomId) return;
    const room = getJunctionRoom(currentRoomId);
    // Match by socketId OR tag
    const queueItem = room.waitingQueue.find(q =>
      q.socketId === socket.id ||
      (currentUserProfile && String(q.tag) === String(currentUserProfile.tag))
    );
    if (queueItem) {
      queueItem.raisedHand = !queueItem.raisedHand;
      broadcastRoomState(currentRoomId);
      console.log(`[Room] "${currentUserProfile?.displayName}" toggled hand: ${queueItem.raisedHand}`);
    } else {
      console.log(`[Room] toggle-queue-hand: user not found in queue. socket=${socket.id} tag=${currentUserProfile?.tag}`);
    }
  });

  // Submit Quick Comment (max 30 chars)
  socket.on('submit-quick-comment', ({ comment }) => {
    if (!currentRoomId || typeof comment !== 'string') return;
    const room = getJunctionRoom(currentRoomId);

    // Match by socketId OR tag (handles reconnection scenarios)
    const queueItem = room.waitingQueue.find(q =>
      q.socketId === socket.id ||
      (currentUserProfile && String(q.tag) === String(currentUserProfile.tag))
    );
    const activeItem = room.activeMembers.find(m =>
      m.socketId === socket.id ||
      (currentUserProfile && String(m.tag) === String(currentUserProfile.tag))
    );

    const targetUser = queueItem || activeItem;
    if (targetUser) {
      targetUser.quickComment = comment.trim().substring(0, 30);
      targetUser.commentUsed = true;
      broadcastRoomState(currentRoomId);
      console.log(`[Room] "${currentUserProfile?.displayName}" submitted comment: "${targetUser.quickComment}"`);
    } else {
      console.log(`[Room] submit-quick-comment: user not found. socket=${socket.id} tag=${currentUserProfile?.tag}`);
      console.log(`[Room] Active members:`, room.activeMembers.map(m => `${m.displayName}(${m.socketId})`));
      console.log(`[Room] Queue members:`, room.waitingQueue.map(q => `${q.displayName}(${q.socketId})`));
    }
  });

  // Moderator Admits a Waiting Queue User to Active Stage
  socket.on('admit-user', ({ targetSocketId, targetTag }) => {
    let roomId = currentRoomId;
    if (!roomId) {
      for (const [rId, rData] of junctionRooms.entries()) {
        if (rData.activeMembers.some(m => m.socketId === socket.id || (currentUserProfile && String(m.tag) === String(currentUserProfile.tag)))) {
          roomId = rId;
          break;
        }
      }
    }

    console.log(`[Room] admit-user: socket=${socket.id} roomId=${roomId} targetSocketId=${targetSocketId} targetTag=${targetTag}`);

    if (!roomId) {
      console.log(`[Room] admit-user: roomId not found!`);
      return;
    }

    const room = getJunctionRoom(roomId);
    const now = Date.now();

    // Requester must be active stage member and a moderator
    const requester = room.activeMembers.find(m =>
      m.socketId === socket.id ||
      (currentUserProfile && String(m.tag) === String(currentUserProfile.tag))
    );
    const isRequesterMod = isMemberModerator(requester, room.activeMembers, now);

    console.log(`[Room] admit-user: requester=${requester?.displayName} isMod=${isRequesterMod} activeMembers=${room.activeMembers.map(m => m.displayName)}`);
    console.log(`[Room] admit-user: waitingQueue=${room.waitingQueue.map(q => `${q.displayName}(socketId=${q.socketId},tag=${q.tag})`)}`);

    if (!requester || !isRequesterMod) {
      socket.emit('action-error', { message: 'Only Stage Moderators (10+ min on stage, max 4) can admit waiting users.' });
      return;
    }

    // Find target in waiting queue by socketId or tag or name
    const queueIdx = room.waitingQueue.findIndex(q =>
      (targetSocketId && q.socketId === targetSocketId) ||
      (targetTag && String(q.tag) === String(targetTag)) ||
      (targetTag && q.displayName && q.displayName.includes(targetTag))
    );

    console.log(`[Room] admit-user: queueIdx=${queueIdx} for targetSocketId=${targetSocketId} targetTag=${targetTag}`);

    if (queueIdx === -1) {
      socket.emit('action-error', { message: 'User is no longer in the waiting queue.' });
      return;
    }

    // Target user object to admit
    const admittedUser = room.waitingQueue[queueIdx];
    const admittedTag = String(admittedUser.tag || targetTag);
    const targetSock = admittedUser.socketId || targetSocketId;

    // Filter out ALL instances of admitted user from waitingQueue so they never remain below!
    room.waitingQueue = room.waitingQueue.filter(q =>
      String(q.tag) !== admittedTag &&
      (!targetSock || q.socketId !== targetSock)
    );

    // If stage is full (8/8), admit action has no effect
    if (room.activeMembers.length >= MAX_STAGE_SLOTS) {
      console.log(`[Room] admit-user: stage is full (${room.activeMembers.length}/${MAX_STAGE_SLOTS}). Admit action has no effect.`);
      socket.emit('action-error', { message: `Active Stage is full (${MAX_STAGE_SLOTS}/${MAX_STAGE_SLOTS} participants).` });
      return;
    }

    // Remove any stale instance of admitted user from activeMembers before pushing
    room.activeMembers = room.activeMembers.filter(m =>
      String(m.tag) !== admittedTag &&
      (!targetSock || m.socketId !== targetSock)
    );

    // Admit target user to active stage
    admittedUser.joinedActiveAt = now;
    admittedUser.removalsCount = 0;
    admittedUser.isMuted = true;
    admittedUser.isSpeaking = false;
    room.activeMembers.push(admittedUser);

    if (admittedUser.socketId) {
      io.to(admittedUser.socketId).emit('role-assigned', { role: 'active' });
    }

    const modName = requester.displayName || `Cockroach #${requester.tag}`;
    const userName = admittedUser.displayName || `Cockroach #${admittedUser.tag}`;
    io.to(roomId).emit('removal-toast', { message: `${modName} admitted ${userName} to the stage.` });

    console.log(`[Room] admit-user SUCCESS: "${modName}" admitted "${userName}".`);
    broadcastRoomState(roomId);
  });

  // Moderator Removes an Active Member to Waiting Queue
  socket.on('remove-user', ({ targetSocketId, targetTag }) => {
    let roomId = currentRoomId;
    if (!roomId) {
      for (const [rId, rData] of junctionRooms.entries()) {
        if (rData.activeMembers.some(m => m.socketId === socket.id || (currentUserProfile && String(m.tag) === String(currentUserProfile.tag)))) {
          roomId = rId;
          break;
        }
      }
    }

    console.log(`[Room] remove-user: socket=${socket.id} roomId=${roomId} targetSocketId=${targetSocketId} targetTag=${targetTag}`);

    if (!roomId) {
      console.log(`[Room] remove-user: roomId not found!`);
      return;
    }

    const room = getJunctionRoom(roomId);
    const now = Date.now();

    const requester = room.activeMembers.find(m => m.socketId === socket.id || (currentUserProfile && String(m.tag) === String(currentUserProfile.tag)));
    const isRequesterMod = isMemberModerator(requester, room.activeMembers, now);

    console.log(`[Room] remove-user: requester=${requester?.displayName} isMod=${isRequesterMod}`);

    if (!requester || !isRequesterMod) {
      socket.emit('action-error', { message: 'Only Stage Moderators (10+ min on stage, max 4) can remove debaters.' });
      return;
    }

    // Cannot remove self
    if (targetSocketId === socket.id || (targetTag && currentUserProfile && String(targetTag) === String(currentUserProfile.tag))) return;

    const activeIdx = room.activeMembers.findIndex(m =>
      (targetSocketId && m.socketId === targetSocketId) ||
      (targetTag && String(m.tag) === String(targetTag))
    );
    if (activeIdx !== -1) {
      const removedUser = room.activeMembers[activeIdx];
      const remTag = String(removedUser.tag || targetTag);

      // Remove ALL instances of removed user from activeMembers
      room.activeMembers = room.activeMembers.filter(m => String(m.tag) !== remTag && (!targetSocketId || m.socketId !== targetSocketId));

      // Prevent duplicate entry in waitingQueue before pushing
      room.waitingQueue = room.waitingQueue.filter(q => String(q.tag) !== remTag);

      removedUser.joinedWaitAt = now;
      removedUser.raisedHand = false;
      removedUser.quickComment = null;
      removedUser.commentUsed = false;
      room.waitingQueue.push(removedUser);

      if (removedUser.socketId) {
        io.to(removedUser.socketId).emit('role-assigned', { role: 'queue' });
      }

      const modName = requester.displayName || `Cockroach #${requester.tag}`;
      const userName = removedUser.displayName || `Cockroach #${removedUser.tag}`;
      io.to(roomId).emit('removal-toast', { message: `${modName} removed ${userName} to the waiting queue.` });
      broadcastRoomState(roomId);
    }
  });

  // Handle Explicit Leave Room
  const handleExplicitLeave = () => {
    if (currentRoomId && junctionRooms.has(currentRoomId)) {
      const room = junctionRooms.get(currentRoomId);
      const tagToCleanup = currentUserProfile?.tag;

      room.activeMembers = room.activeMembers.filter(m => m.socketId !== socket.id && (!tagToCleanup || String(m.tag) !== String(tagToCleanup)));
      room.waitingQueue = room.waitingQueue.filter(q => q.socketId !== socket.id && (!tagToCleanup || String(q.tag) !== String(tagToCleanup)));

      socket.to(currentRoomId).emit('peer-left', { socketId: socket.id, tag: tagToCleanup });
      socket.leave(currentRoomId);

      broadcastRoomState(currentRoomId);
      console.log(`[Socket.io] Socket ${socket.id} (${currentUserProfile?.displayName}) explicitly LEFT room "${currentRoomId}".`);
    }
  };

  // Handle Socket Disconnect (e.g. Page Refresh with 15s Reconnection Grace Period)
  const handleDisconnect = () => {
    if (currentRoomId && junctionRooms.has(currentRoomId)) {
      const room = junctionRooms.get(currentRoomId);
      const tagToCleanup = currentUserProfile?.tag;
      const sockIdToCleanup = socket.id;

      socket.to(currentRoomId).emit('peer-left', { socketId: sockIdToCleanup, tag: tagToCleanup });
      socket.leave(currentRoomId);

      console.log(`[Socket.io] Socket ${sockIdToCleanup} (${currentUserProfile?.displayName}) DISCONNECTED (15s grace period starting).`);

      setTimeout(() => {
        if (!tagToCleanup) return;
        const currentJunctionRoom = junctionRooms.get(currentRoomId);
        if (!currentJunctionRoom) return;

        const activeItem = currentJunctionRoom.activeMembers.find(m => String(m.tag) === String(tagToCleanup));
        const queueItem = currentJunctionRoom.waitingQueue.find(q => String(q.tag) === String(tagToCleanup));

        const isReconnected = (activeItem && activeItem.socketId !== sockIdToCleanup) || (queueItem && queueItem.socketId !== sockIdToCleanup);

        if (!isReconnected) {
          currentJunctionRoom.activeMembers = currentJunctionRoom.activeMembers.filter(m => m.socketId !== sockIdToCleanup && String(m.tag) !== String(tagToCleanup));
          currentJunctionRoom.waitingQueue = currentJunctionRoom.waitingQueue.filter(q => q.socketId !== sockIdToCleanup && String(q.tag) !== String(tagToCleanup));
          broadcastRoomState(currentRoomId);
          console.log(`[Socket.io] Grace period expired for tag #${tagToCleanup}. Purged from room.`);
        } else {
          console.log(`[Socket.io] Grace period expired for tag #${tagToCleanup}, but user RECONNECTED cleanly! Preserved role.`);
        }
      }, 15000);
    }
  };

  socket.on('leave-room', handleExplicitLeave);
  socket.on('disconnect', handleDisconnect);
});

// Serve static frontend files (HTML, CSS, JS, Images)
app.use(express.static(__dirname));

// Default fallback to index.html for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`\n🚀 CockroachTalk Express Server + Socket.io running at http://localhost:${PORT}/\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️ Port ${PORT} is already in use by another process.`);
    console.error(`Attempting to start on fallback port ${Number(PORT) + 1}...\n`);
    server.listen(Number(PORT) + 1, () => {
      console.log(`\n🚀 CockroachTalk Express Server running at http://localhost:${Number(PORT) + 1}/\n`);
    });
  } else {
    console.error('Server error:', err);
  }
});
