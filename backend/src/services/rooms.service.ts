import { SPECIES_LIST, MAX_STAGE_SLOTS, MODERATOR_WAIT_TIME_MS } from '../config/constants.js';
import { JunctionRoomState, RoomStatePayload, RoomListItem, ActiveMember, QueueMember } from '../types/index.js';

export const junctionRooms = new Map<string, JunctionRoomState>();

export function getJunctionRoom(roomId: string): JunctionRoomState | null {
  if (!junctionRooms.has(roomId)) {
    const species = SPECIES_LIST.find((sp) => sp.id === roomId);
    if (species) {
      junctionRooms.set(roomId, {
        name: species.name,
        isCustom: false,
        password: null,
        activeMembers: [],
        waitingQueue: []
      });
    } else {
      return null;
    }
  }
  return junctionRooms.get(roomId)!;
}

export function getModeratorSocketsAndTags(
  activeMembers: ActiveMember[],
  now: number = Date.now(),
  capacity: number = MAX_STAGE_SLOTS
): { modSockets: Set<string>; modTags: Set<string>; seniorModSocketId: string | null } {
  const maxMods = Math.max(1, Math.floor(capacity / 2)); // Up to 4 mods for capacity 8

  // Sort by earliest joinedActiveAt
  const sorted = [...activeMembers].sort(
    (a, b) => (a.joinedActiveAt || 0) - (b.joinedActiveAt || 0)
  );

  const modSockets = new Set<string>();
  const modTags = new Set<string>();
  let seniorModSocketId: string | null = null;

  if (sorted.length > 0) {
    // Senior Mod: The earliest active member on stage is automatically a moderator
    const senior = sorted[0];
    seniorModSocketId = senior.socketId || null;
    if (senior.socketId) modSockets.add(senior.socketId);
    if (senior.tag) modTags.add(String(senior.tag));
  }

  // Other active members who have spent >= MODERATOR_WAIT_TIME_MS (e.g. 60s)
  for (let i = 1; i < sorted.length && modSockets.size < maxMods; i++) {
    const member = sorted[i];
    if (member.joinedActiveAt && now - member.joinedActiveAt >= MODERATOR_WAIT_TIME_MS) {
      if (member.socketId) modSockets.add(member.socketId);
      if (member.tag) modTags.add(String(member.tag));
    }
  }

  return { modSockets, modTags, seniorModSocketId };
}

export type StageRole = 'lead' | 'mod' | 'debater';

export function getStageMemberRole(
  member: { socketId?: string; tag?: string } | null,
  activeMembers: ActiveMember[],
  now: number = Date.now(),
  capacity: number = MAX_STAGE_SLOTS
): StageRole | null {
  if (!member) return null;
  const sorted = [...activeMembers].sort(
    (a, b) => (a.joinedActiveAt || 0) - (b.joinedActiveAt || 0)
  );

  const idx = sorted.findIndex(
    (m) =>
      (member.socketId && m.socketId === member.socketId) ||
      (member.tag && String(m.tag) === String(member.tag))
  );

  if (idx === -1) return null;
  if (idx === 0) return 'lead';

  const maxMods = Math.max(1, Math.floor(capacity / 2));
  const activeMem = sorted[idx];
  if (
    idx < maxMods &&
    activeMem.joinedActiveAt &&
    now - activeMem.joinedActiveAt >= MODERATOR_WAIT_TIME_MS
  ) {
    return 'mod';
  }

  return 'debater';
}

export function canDemoteTarget(
  requester: { socketId?: string; tag?: string } | null,
  target: { socketId?: string; tag?: string } | null,
  activeMembers: ActiveMember[],
  now: number = Date.now(),
  capacity: number = MAX_STAGE_SLOTS
): { allowed: boolean; reason?: string } {
  if (!requester || !target) return { allowed: false, reason: 'Invalid member' };

  const isSame =
    (requester.socketId && target.socketId && requester.socketId === target.socketId) ||
    (requester.tag && target.tag && String(requester.tag) === String(target.tag));
  if (isSame) return { allowed: false, reason: 'You cannot demote yourself.' };

  const requesterRole = getStageMemberRole(requester, activeMembers, now, capacity);
  const targetRole = getStageMemberRole(target, activeMembers, now, capacity);

  if (!requesterRole) return { allowed: false, reason: 'You are not on the active stage.' };
  if (!targetRole) return { allowed: false, reason: 'Target speaker is not on the active stage.' };

  if (requesterRole === 'lead') {
    // Room Lead is the most powerful: can remove or demote anyone (mod or debater)
    return { allowed: true };
  }

  if (requesterRole === 'mod') {
    // Moderator can ONLY demote regular debaters, not other mods and not the lead!
    if (targetRole === 'debater') {
      return { allowed: true };
    }
    if (targetRole === 'lead') {
      return { allowed: false, reason: 'Moderators cannot demote the Room Lead.' };
    }
    if (targetRole === 'mod') {
      return { allowed: false, reason: 'Moderators cannot demote other moderators. Only the Room Lead can.' };
    }
  }

  return { allowed: false, reason: 'Only the Room Lead and Moderators can demote speakers.' };
}

// Keep canModerateTarget as alias to canDemoteTarget for backwards compatibility
export const canModerateTarget = canDemoteTarget;

export function canMuteTarget(
  requester: { socketId?: string; tag?: string } | null,
  target: { socketId?: string; tag?: string } | null,
  activeMembers: ActiveMember[],
  now: number = Date.now(),
  capacity: number = MAX_STAGE_SLOTS
): { allowed: boolean; reason?: string } {
  if (!requester || !target) return { allowed: false, reason: 'Invalid member' };

  const isSame =
    (requester.socketId && target.socketId && requester.socketId === target.socketId) ||
    (requester.tag && target.tag && String(requester.tag) === String(target.tag));
  if (isSame) return { allowed: false, reason: 'You cannot mute yourself with moderator controls. Toggle your mic instead.' };

  const requesterRole = getStageMemberRole(requester, activeMembers, now, capacity);
  const targetRole = getStageMemberRole(target, activeMembers, now, capacity);

  if (!requesterRole) return { allowed: false, reason: 'Only speakers on stage can mute participants.' };
  if (!targetRole) return { allowed: false, reason: 'Target speaker is not on the active stage.' };

  // Rule: Lead can mute anyone, anyone can mute anyone except lead, NO ONE can mute lead
  if (targetRole === 'lead') {
    return { allowed: false, reason: 'No one can mute the Room Lead.' };
  }

  // Any stage participant (lead, mod, debater) can mute any non-lead speaker
  return { allowed: true };
}

export function isMemberModerator(
  member: { socketId?: string; tag?: string } | null,
  activeMembers: ActiveMember[],
  now: number = Date.now(),
  capacity: number = MAX_STAGE_SLOTS
): boolean {
  if (!member) return false;
  const role = getStageMemberRole(member, activeMembers, now, capacity);
  return role === 'lead' || role === 'mod';
}

export function popNextQueueMember(roomId: string, now: number = Date.now()): ActiveMember | null {
  const room = getJunctionRoom(roomId);
  if (!room || room.waitingQueue.length === 0) return null;
  if (room.activeMembers.length >= MAX_STAGE_SLOTS) return null;

  // Prioritize users with raisedHand === true (earliest joinedWaitAt first), then regular queue users (earliest joinedWaitAt first)
  const handRaisers = room.waitingQueue
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => item.raisedHand)
    .sort((a, b) => (a.item.joinedWaitAt || 0) - (b.item.joinedWaitAt || 0));

  let chosenIdx = -1;
  if (handRaisers.length > 0) {
    chosenIdx = handRaisers[0].idx;
  } else {
    let earliestWait = Infinity;
    for (let i = 0; i < room.waitingQueue.length; i++) {
      const wait = room.waitingQueue[i].joinedWaitAt || 0;
      if (wait < earliestWait) {
        earliestWait = wait;
        chosenIdx = i;
      }
    }
  }

  if (chosenIdx === -1) chosenIdx = 0;

  const [poppedUser] = room.waitingQueue.splice(chosenIdx, 1);
  if (!poppedUser) return null;

  // Filter out any stale duplicate before adding
  room.activeMembers = room.activeMembers.filter(
    (m) => String(m.tag) !== String(poppedUser.tag) && (!poppedUser.socketId || m.socketId !== poppedUser.socketId)
  );

  const newActive: ActiveMember = {
    socketId: poppedUser.socketId,
    tag: poppedUser.tag,
    displayName: poppedUser.displayName,
    gender: poppedUser.gender,
    joinedActiveAt: now,
    removalsCount: 0,
    isMuted: true,
    isSpeaking: false,
    isVideoEnabled: false,
    isScreenSharing: false,
    roleOnStage: 'debater',
    isLead: false
  };

  room.activeMembers.push(newActive);
  return newActive;
}

export function buildRoomStatePayload(roomId: string, now: number = Date.now()): RoomStatePayload | null {
  const room = getJunctionRoom(roomId);
  if (!room) return null;

  const { seniorModSocketId } = getModeratorSocketsAndTags(
    room.activeMembers,
    now,
    MAX_STAGE_SLOTS
  );

  const sorted = [...room.activeMembers].sort(
    (a, b) => (a.joinedActiveAt || 0) - (b.joinedActiveAt || 0)
  );

  const activeMembers = sorted.map((m, idx) => {
    let roleOnStage: StageRole = 'debater';
    if (idx === 0) {
      roleOnStage = 'lead';
    } else if (
      idx < Math.floor(MAX_STAGE_SLOTS / 2) &&
      m.joinedActiveAt &&
      now - m.joinedActiveAt >= MODERATOR_WAIT_TIME_MS
    ) {
      roleOnStage = 'mod';
    }

    const isLead = roleOnStage === 'lead';
    const isMod = roleOnStage === 'mod' || isLead;
    const activeTimeMs = now - (m.joinedActiveAt || now);
    const timeUntilModeratorMs = isMod
      ? 0
      : Math.max(0, MODERATOR_WAIT_TIME_MS - activeTimeMs);

    return {
      socketId: m.socketId,
      tag: m.tag,
      name: m.displayName,
      gender: m.gender,
      joinedActiveAt: m.joinedActiveAt,
      activeTimeMs,
      timeUntilModeratorMs,
      roleOnStage,
      isLead,
      isModerator: isMod,
      isMuted: m.isMuted,
      isSpeaking: m.isSpeaking,
      isVideoEnabled: m.isVideoEnabled,
      isScreenSharing: !!m.isScreenSharing,
      avatarType: m.avatarType || 'initials',
      avatarValue: m.avatarValue || '',
      accentColor: m.accentColor || 'cyber-purple',
      bubbleStyle: m.bubbleStyle || 'rounded',
      statusTag: m.statusTag || ''
    };
  });

  const waitingQueue = room.waitingQueue.map((q) => {
    const waitTimeMs = now - q.joinedWaitAt;
    return {
      socketId: q.socketId,
      tag: q.tag,
      name: q.displayName,
      gender: q.gender,
      joinedWaitAt: q.joinedWaitAt,
      waitTimeMs,
      canComment: !q.commentUsed,
      raisedHand: !!q.raisedHand,
      quickComment: q.quickComment || null,
      commentUsed: !!q.commentUsed,
      avatarType: q.avatarType || 'initials',
      avatarValue: q.avatarValue || '',
      accentColor: q.accentColor || 'cyber-purple',
      bubbleStyle: q.bubbleStyle || 'rounded',
      statusTag: q.statusTag || ''
    };
  });

  return {
    roomId,
    name: room.name || roomId,
    isCustom: !!room.isCustom,
    hasPassword: !!room.password,
    activeMembers,
    waitingQueue,
    seniorModSocketId,
    capacity: MAX_STAGE_SLOTS
  };
}

export function createCustomRoom(topic: string, password?: string): string {
  const roomId = 'temp-' + Math.random().toString(36).substring(2, 10);
  junctionRooms.set(roomId, {
    name: topic.trim().substring(0, 50),
    isCustom: true,
    password: password ? password.trim() : null,
    activeMembers: [],
    waitingQueue: [],
    emptySince: Date.now()
  });
  return roomId;
}

export function getRoomsSummary(): RoomListItem[] {
  const rooms: RoomListItem[] = [];

  // Default species / state rooms
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
      allUsers: jRoom
        ? [
            ...jRoom.activeMembers.map((m) => ({ name: m.displayName, tag: m.tag })),
            ...jRoom.waitingQueue.map((q) => ({ name: q.displayName, tag: q.tag }))
          ]
            .filter((v, i, a) => a.findIndex((t) => t.tag === v.tag) === i)
            .slice(0, 3)
        : []
    });
  });

  // Custom rooms
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
          ...rData.activeMembers.map((m) => ({ name: m.displayName, tag: m.tag })),
          ...rData.waitingQueue.map((q) => ({ name: q.displayName, tag: q.tag }))
        ]
          .filter((v, i, a) => a.findIndex((t) => t.tag === v.tag) === i)
          .slice(0, 3)
      });
    }
  }

  return rooms;
}

export function removeUserFromRoom(roomId: string, tag: string): boolean {
  const room = junctionRooms.get(roomId);
  if (!room) return false;

  const safeTag = String(tag);
  const hadActive = room.activeMembers.some((m) => String(m.tag) === safeTag);
  const hadQueue = room.waitingQueue.some((q) => String(q.tag) === safeTag);

  room.activeMembers = room.activeMembers.filter((m) => String(m.tag) !== safeTag);
  room.waitingQueue = room.waitingQueue.filter((q) => String(q.tag) !== safeTag);

  return hadActive || hadQueue;
}
