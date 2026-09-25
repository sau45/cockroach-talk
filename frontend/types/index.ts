export interface UserProfile {
  tag: string;
  handle: string;
  hasChosenGender?: boolean;
  gender: string;
  bio: string;
  profilePicture?: string;
  avatarType?: 'initials' | 'identicon' | 'emoji';
  avatarValue?: string;
  accentColor?: string;
  bubbleStyle?: 'sharp' | 'rounded' | 'outline';
  statusTag?: string;
}

export interface SoundPreferences {
  sendSound: boolean;
  receiveSound: boolean;
  typingSound: boolean;
}

export interface ActiveMember {
  socketId: string;
  tag: string;
  name: string;
  gender: string;
  joinedActiveAt: number;
  activeTimeMs: number;
  isModerator: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  isVideoEnabled?: boolean;
  isScreenSharing: boolean;
  timeUntilModeratorMs?: number;
  roleOnStage?: 'lead' | 'mod' | 'debater';
  isLead?: boolean;
  avatarType?: 'initials' | 'identicon' | 'emoji';
  avatarValue?: string;
  accentColor?: string;
  bubbleStyle?: 'sharp' | 'rounded' | 'outline';
  statusTag?: string;
}

export interface QueueMember {
  socketId: string;
  tag: string;
  name: string;
  gender: string;
  joinedWaitAt: number;
  waitTimeMs: number;
  canComment: boolean;
  raisedHand: boolean;
  quickComment: string | null;
  commentUsed: boolean;
  avatarType?: 'initials' | 'identicon' | 'emoji';
  avatarValue?: string;
  accentColor?: string;
  bubbleStyle?: 'sharp' | 'rounded' | 'outline';
  statusTag?: string;
}

export interface RoomState {
  roomId: string;
  name: string;
  isCustom: boolean;
  hasPassword: boolean;
  activeMembers: ActiveMember[];
  waitingQueue: QueueMember[];
  seniorModSocketId: string | null;
  capacity: number;
}

export interface CommentItem {
  _id: string;
  roomId: string;
  authorTag: string;
  authorName: string;
  authorAvatarType?: 'initials' | 'identicon' | 'emoji';
  authorAvatarValue?: string;
  authorAccentColor?: string;
  authorBubbleStyle?: 'sharp' | 'rounded' | 'outline';
  authorStatus?: string;
  parentId?: string | null;
  rootId?: string | null;
  depth: number;
  body: string;
  score: number;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  isDeleted: boolean;
  editedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSummary {
  id: string;
  name: string;
  isCustom: boolean;
  hasPassword: boolean;
  activeMembersCount: number;
  waitingQueueCount: number;
  totalListeners: number;
  allUsers: { name: string; tag: string }[];
}
