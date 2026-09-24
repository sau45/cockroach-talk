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
import mongoose from 'mongoose';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import commentsRoute from './routes/comments.js';
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
app.use(helmet({ contentSecurityPolicy: false })); // disable CSP to not break inline scripts
app.use(mongoSanitize());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/comments', commentsRoute(io));

// Serve TURN credentials securely from environment variables
app.get('/api/turn-credentials', (req, res) => {
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;
  
  if (turnUsername && turnCredential) {
    res.json({
      iceServers: [
        { urls: "stun:stun.relay.metered.ca:80" },
        { urls: "turn:global.relay.metered.ca:80", username: turnUsername, credential: turnCredential },
        { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: turnUsername, credential: turnCredential },
        { urls: "turn:global.relay.metered.ca:443", username: turnUsername, credential: turnCredential },
        { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: turnUsername, credential: turnCredential }
      ]
    });
  } else {
    // Fallback if environment variables are not set
    res.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
  }
});

// Global user state variables
let usersCollection = null;
let countersCollection = null;
let reportsCollection = null;

// Initialize MongoDB Connection if MONGODB_URI is specified
if (process.env.MONGODB_URI) {
  const mongoClient = new MongoClient(process.env.MONGODB_URI);
  mongoClient.connect().then(() => {
    const db = mongoClient.db(process.env.MONGODB_DB || 'cockroachtalk');
    usersCollection = db.collection('users');
    countersCollection = db.collection('counters');
    reportsCollection = db.collection('reports');
    
    // Ensure the global counter document exists
    countersCollection.updateOne(
      { _id: 'userid' },
      { $setOnInsert: { seq: 1000 } },
      { upsert: true }
    ).catch(e => console.warn('Counter init error', e));

    console.log('✅ MongoDB connected for CockroachTalk user management.');
  }).catch((err) => {
    console.error('❌ MONGODB CONNECTION FAILED! Check your IP Whitelist in MongoDB Atlas or ensure the cluster is active. Error:', err.message);
  });

  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Mongoose connected for Threaded Comments.'))
    .catch(e => console.error('❌ Mongoose connection failed:', e));
}

// Track Junction Debate rooms (roomId -> { activeMembers: [], waitingQueue: [] })
const junctionRooms = new Map();
const MAX_STAGE_SLOTS = 8;
const INITIAL_STAGE_SLOTS = 2;

function getJunctionRoom(roomId) {
  if (!junctionRooms.has(roomId)) {
    const isSpecies = SPECIES_LIST.some(sp => sp.id === roomId);
    if (isSpecies) {
      const sp = SPECIES_LIST.find(s => s.id === roomId);
      junctionRooms.set(roomId, { 
        name: sp.name, 
        isCustom: false, 
        password: null, 
        activeMembers: [], 
        waitingQueue: [] 
      });
    } else {
      return null;
    }
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
        isSpeaking: m.isSpeaking,
        isVideoEnabled: m.isVideoEnabled,
        isScreenSharing: !!m.isScreenSharing
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
    name: room.name || roomId,
    isCustom: !!room.isCustom,
    hasPassword: !!room.password,
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

// Periodic tick every 5 seconds to update timers and cleanup empty custom rooms
setInterval(() => {
  const now = Date.now();
  for (const roomId of junctionRooms.keys()) {
    const room = junctionRooms.get(roomId);
    
    // Cleanup empty custom rooms older than 5 minutes
    if (room.isCustom) {
      if (room.activeMembers.length === 0 && room.waitingQueue.length === 0) {
        if (!room.emptySince) {
          room.emptySince = now;
        } else if (now - room.emptySince > 5 * 60 * 1000) {
          junctionRooms.delete(roomId);
          console.log(`[Room Cleanup] Deleted empty custom room: ${roomId}`);
          continue; // Skip broadcast
        }
      } else {
        room.emptySince = null; // Reset if someone joins
      }
    }

    if (room.activeMembers.length > 0 || room.waitingQueue.length > 0) {
      broadcastRoomState(roomId);
    }
  }
}, 5000);

/**
 * GET /api/rooms - Deduplicated active participant metrics for all State Cockroach rooms + Custom Rooms
 */
app.get('/api/rooms', (req, res) => {
  const rooms = [];

  // Add default species rooms
  SPECIES_LIST.forEach((sp) => {
    const jRoom = junctionRooms.get(sp.id);
    const activeCount = jRoom ? jRoom.activeMembers.length : 0;
    const waitingCount = jRoom ? jRoom.waitingQueue.length : 0;

    rooms.push({
      id: sp.id,
      name: sp.name,
      isCustom: false,
      hasPassword: false,
      activeMembersCount: activeCount,
      waitingQueueCount: waitingCount,
      totalListeners: activeCount + waitingCount,
      allUsers: jRoom ? [
        ...jRoom.activeMembers.map(m => ({ name: m.displayName, tag: m.tag })),
        ...jRoom.waitingQueue.map(q => ({ name: q.displayName, tag: q.tag }))
      ].filter((v, i, a) => a.findIndex(t => (t.tag === v.tag)) === i).slice(0, 3) : []
    });
  });

  // Add custom rooms
  for (const [rId, rData] of junctionRooms.entries()) {
    if (rData.isCustom) {
      const activeCount = rData.activeMembers.length;
      const waitingCount = rData.waitingQueue.length;
      rooms.push({
        id: rId,
        name: rData.name,
        isCustom: true,
        hasPassword: !!rData.password,
        activeMembersCount: activeCount,
        waitingQueueCount: waitingCount,
        totalListeners: activeCount + waitingCount,
        allUsers: [
          ...rData.activeMembers.map(m => ({ name: m.displayName, tag: m.tag })),
          ...rData.waitingQueue.map(q => ({ name: q.displayName, tag: q.tag }))
        ].filter((v, i, a) => a.findIndex(t => (t.tag === v.tag)) === i).slice(0, 3)
      });
    }
  }

  res.json(rooms);
});

/**
 * Admin Authentication Middleware
 */
function requireAdmin(req, res, next) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'];
  if (providedPassword === adminPassword) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized: Invalid admin password.' });
  }
}

/**
 * GET /api/admin/reports - Fetch pending reports
 */
app.get('/api/admin/reports', requireAdmin, async (req, res) => {
  if (!reportsCollection) return res.json({ success: true, reports: [] });
  try {
    const reports = await reportsCollection.find({ status: 'pending' }).sort({ timestamp: -1 }).toArray();
    res.json({ success: true, reports });
  } catch (err) {
    console.error('[Admin API] Error fetching reports:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/**
 * POST /api/admin/ban - Ban a user and kick them
 */
app.post('/api/admin/ban', requireAdmin, async (req, res) => {
  const { targetTag } = req.body;
  if (!targetTag) return res.status(400).json({ success: false, message: 'Missing target tag.' });
  
  try {
    if (usersCollection) {
      await usersCollection.updateOne({ tag: targetTag }, { $set: { isBanned: true } });
    }
    if (reportsCollection) {
      await reportsCollection.updateMany({ reportedTag: targetTag }, { $set: { status: 'banned' } });
    }
    
    // Kick user from any active rooms
    kickBannedUser(targetTag);
    
    res.json({ success: true, message: `User ${targetTag} banned successfully.` });
  } catch (err) {
    console.error('[Admin API] Error banning user:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/**
 * POST /api/admin/dismiss - Dismiss a report
 */
app.post('/api/admin/dismiss', requireAdmin, async (req, res) => {
  const { reportId } = req.body;
  if (!reportId) return res.status(400).json({ success: false, message: 'Missing reportId.' });
  
  try {
    if (reportsCollection) {
      const { ObjectId } = await import('mongodb');
      await reportsCollection.updateOne({ _id: new ObjectId(reportId) }, { $set: { status: 'dismissed' } });
    }
    res.json({ success: true, message: `Report dismissed.` });
  } catch (err) {
    console.error('[Admin API] Error dismissing report:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/**
 * GET /api/admin/banned - Fetch all banned users
 */
app.get('/api/admin/banned', requireAdmin, async (req, res) => {
  if (!usersCollection) return res.json({ success: true, bannedUsers: [] });
  try {
    const bannedUsers = await usersCollection.find({ isBanned: true }).sort({ _id: -1 }).toArray();
    res.json({ success: true, bannedUsers });
  } catch (err) {
    console.error('[Admin API] Error fetching banned users:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

/**
 * POST /api/admin/unban - Unban a user
 */
app.post('/api/admin/unban', requireAdmin, async (req, res) => {
  const { targetTag } = req.body;
  if (!targetTag) return res.status(400).json({ success: false, message: 'Missing target tag.' });
  
  try {
    if (usersCollection) {
      await usersCollection.updateOne({ tag: targetTag }, { $set: { isBanned: false } });
    }
    res.json({ success: true, message: `User ${targetTag} unbanned successfully.` });
  } catch (err) {
    console.error('[Admin API] Error unbanning user:', err);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

function kickBannedUser(tag) {
  for (const [roomId, room] of junctionRooms.entries()) {
    let kicked = false;
    
    const activeIdx = room.activeMembers.findIndex(m => m.tag === tag);
    if (activeIdx !== -1) {
      const socketId = room.activeMembers[activeIdx].socketId;
      room.activeMembers.splice(activeIdx, 1);
      io.to(socketId).emit('banned', { message: 'You have been banned.' });
      io.sockets.sockets.get(socketId)?.disconnect(true);
      kicked = true;
    }
    
    const waitIdx = room.waitingQueue.findIndex(m => m.tag === tag);
    if (waitIdx !== -1) {
      const socketId = room.waitingQueue[waitIdx].socketId;
      room.waitingQueue.splice(waitIdx, 1);
      io.to(socketId).emit('banned', { message: 'You have been banned.' });
      io.sockets.sockets.get(socketId)?.disconnect(true);
      kicked = true;
    }
    
    if (kicked) {
      broadcastRoomState(roomId);
    }
  }
}

/**
 * POST /api/report-user - Submit a user report to MongoDB
 */
app.post('/api/report-user', async (req, res) => {
  const { reporterTag, reportedTag, reason } = req.body;
  
  if (!reporterTag || !reportedTag || !reason) {
    return res.status(400).json({ success: false, message: 'Missing required report fields.' });
  }

  if (reportsCollection) {
    try {
      await reportsCollection.insertOne({
        reporterTag,
        reportedTag,
        reason,
        timestamp: new Date(),
        status: 'pending'
      });
      return res.json({ success: true, message: 'Report submitted successfully.' });
    } catch (err) {
      console.error('[API] Error saving report:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  } else {
    // Fallback if MongoDB is not connected
    console.warn('[API] Report received but MongoDB is not connected:', { reporterTag, reportedTag, reason });
    return res.json({ success: true, message: 'Report submitted (mocked).' });
  }
});

/**
 * POST /api/create-room - Create a new temporary custom room
 */
app.post('/api/create-room', (req, res) => {
  const { topic, password } = req.body;
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid room topic.' });
  }
  
  if (!password || typeof password !== 'string' || password.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Password is required to create a room.' });
  }
  
  // Generate a random room ID
  const roomId = 'temp-' + Math.random().toString(36).substring(2, 10);
  
  junctionRooms.set(roomId, {
    name: topic.trim().substring(0, 50),
    isCustom: true,
    password: password.trim(),
    activeMembers: [],
    waitingQueue: [],
    emptySince: Date.now() // Start counting expiry immediately if no one joins
  });

  console.log(`[API] Custom room created: ${roomId} (${topic})`);
  res.json({ success: true, roomId });
});

let memoryCounter = 1001;

/**
 * GET /api/unique-id
 */
app.get('/api/unique-id', async (req, res) => {
  try {
    let nextId = null;

    if (usersCollection && countersCollection) {
      // ATOMIC increment to guarantee no duplicate IDs even if multiple users connect at the same millisecond
      const counterDoc = await countersCollection.findOneAndUpdate(
        { _id: 'userid' },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
      );
      
      const seq = counterDoc.seq || (counterDoc.value && counterDoc.value.seq) || 1001;
      nextId = seq.toString();

      await usersCollection.insertOne({
        tag: nextId,
        tagNum: seq,
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
      const user = await usersCollection.findOne({ tag: String(tag) });
      if (user && user.isBanned) {
        return res.json({ success: true, isBanned: true });
      }

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
 * GET /api/profile/:tag
 * Fetch user profile bio and picture
 */
app.get('/api/profile/:tag', async (req, res) => {
  try {
    const { tag } = req.params;
    if (usersCollection && tag) {
      const user = await usersCollection.findOne({ tag: String(tag) }, { projection: { bio: 1, profilePicture: 1, handle: 1 } });
      if (user) {
        return res.json({ success: true, bio: user.bio, profilePicture: user.profilePicture, handle: user.handle });
      }
    }
    res.json({ success: false, message: 'User not found' });
  } catch (error) {
    res.json({ success: false });
  }
});

/**
 * POST /api/profile
 * Update user bio and profile picture
 */
app.post('/api/profile', async (req, res) => {
  try {
    const { tag, bio, profilePicture } = req.body;
    if (usersCollection && tag) {
      const user = await usersCollection.findOne({ tag: String(tag) });
      if (user && user.isBanned) {
        return res.json({ success: false, message: 'User is banned' });
      }
      
      await usersCollection.updateOne(
        { tag: String(tag) },
        { $set: { bio, profilePicture, lastActiveAt: new Date() } }
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
  socket.on('join-room', async ({ roomId, userProfile, password }) => {
    currentRoomId = roomId;

    if (usersCollection && userProfile?.tag) {
      try {
        const userRec = await usersCollection.findOne({ tag: String(userProfile.tag) });
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
      const totalRoomUsers = room.activeMembers.length + room.waitingQueue.length;
      if (totalRoomUsers >= 8) {
        socket.emit('room-full', { maxCapacity: 8 });
        return;
      }

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
        if (isMuted) {
          member.isSpeaking = false;
        }
        io.to(currentRoomId).emit('peer-mute-changed', {
          socketId: socket.id,
          tag: currentUserProfile.tag,
          isMuted,
          isSpeaking: member.isSpeaking
        });
      }
    }
  });

  // Video Toggle
  socket.on('video-toggle', ({ isVideoEnabled }) => {
    if (currentUserProfile && currentRoomId) {
      const room = getJunctionRoom(currentRoomId);
      const member = findBySocket(room.activeMembers, currentUserProfile.tag);
      if (member) {
        member.isVideoEnabled = isVideoEnabled;
        broadcastRoomState(currentRoomId);
      }
    }
  });

  socket.on('screen-share-toggle', ({ isScreenSharing }) => {
    if (currentUserProfile && currentRoomId) {
      const room = getJunctionRoom(currentRoomId);
      const member = findBySocket(room.activeMembers, currentUserProfile.tag);
      if (member) {
        member.isScreenSharing = isScreenSharing;
        broadcastRoomState(currentRoomId);
      }
    }
  });

  // Dynamic Speaking State
  socket.on('speaking-state', ({ isSpeaking }) => {
    if (currentUserProfile && currentRoomId) {
      const room = getJunctionRoom(currentRoomId);
      const member = findBySocket(room.activeMembers, currentUserProfile.tag);
      if (member && !member.isMuted) {
        member.isSpeaking = isSpeaking;
        io.to(currentRoomId).emit('peer-mute-changed', {
          socketId: socket.id,
          tag: currentUserProfile.tag,
          isMuted: member.isMuted,
          isSpeaking: member.isSpeaking
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

  // Relay Emoji Reactions
  socket.on('send-emoji', ({ emoji }) => {
    if (currentRoomId && emoji) {
      io.to(currentRoomId).emit('room-emoji', {
        socketId: socket.id,
        tag: currentUserProfile?.tag,
        emoji: emoji
      });
    }
  });

  // Relay Chat Messages
  socket.on('send-chat-message', ({ text }) => {
    if (currentRoomId && typeof text === 'string' && text.trim().length > 0) {
      io.to(currentRoomId).emit('room-chat-message', {
        socketId: socket.id,
        tag: currentUserProfile?.tag,
        name: currentUserProfile?.displayName || `Cockroach #${currentUserProfile?.tag}`,
        text: text.trim().substring(0, 500), // Max 500 chars
        timestamp: Date.now()
      });
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

  socket.on('thread:typing', (isTyping) => {
    if (currentRoomId && currentUserProfile) {
      socket.to(currentRoomId).emit('thread:typing', {
        tag: currentUserProfile.tag,
        name: currentUserProfile.displayName,
        isTyping
      });
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
  console.log(`\n<i class="bi bi-rocket-takeoff-fill" aria-hidden="true"></i> CockroachTalk Express Server + Socket.io running at http://localhost:${PORT}/\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n<i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> Port ${PORT} is already in use by another process.`);
    console.error(`Attempting to start on fallback port ${Number(PORT) + 1}...\n`);
    server.listen(Number(PORT) + 1, () => {
      console.log(`\n<i class="bi bi-rocket-takeoff-fill" aria-hidden="true"></i> CockroachTalk Express Server running at http://localhost:${Number(PORT) + 1}/\n`);
    });
  } else {
    console.error('Server error:', err);
  }
});
