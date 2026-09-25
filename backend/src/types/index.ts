export interface UserSession {
  tag: string;
  handle: string;
  hasChosenGender?: boolean;
  gender?: string;
  bio?: string;
  profilePicture?: string;
  avatarType?: 'initials' | 'identicon' | 'emoji';
  avatarValue?: string;
  accentColor?: string;
  bubbleStyle?: 'sharp' | 'rounded' | 'outline';
  statusTag?: string;
}

export interface ActiveMember {
  socketId: string;
  tag: string;
  displayName: string;
  gender: string;
  joinedActiveAt: number;
  removalsCount?: number;
  isMuted: boolean;
  isSpeaking: boolean;
  isVideoEnabled?: boolean;
  isScreenSharing?: boolean;
  quickComment?: string | null;
  commentUsed?: boolean;
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
  displayName: string;
  gender: string;
  joinedWaitAt: number;
  raisedHand: boolean;
  quickComment: string | null;
  commentUsed: boolean;
  avatarType?: 'initials' | 'identicon' | 'emoji';
  avatarValue?: string;
  accentColor?: string;
  bubbleStyle?: 'sharp' | 'rounded' | 'outline';
  statusTag?: string;
}

export interface JunctionRoomState {
  name: string;
  isCustom: boolean;
  password?: string | null;
  activeMembers: ActiveMember[];
  waitingQueue: QueueMember[];
  emptySince?: number | null;
}

export interface RoomStatePayload {
  roomId: string;
  name: string;
  isCustom: boolean;
  hasPassword: boolean;
  activeMembers: {
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
    avatarType?: string;
    avatarValue?: string;
    accentColor?: string;
    bubbleStyle?: string;
    statusTag?: string;
  }[];
  waitingQueue: {
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
    avatarType?: string;
    avatarValue?: string;
    accentColor?: string;
    bubbleStyle?: string;
    statusTag?: string;
  }[];
  seniorModSocketId: string | null;
  capacity: number;
}

export interface CommentDocument {
  _id: string;
  roomId: string;
  authorTag: string;
  authorName: string;
  authorAvatarType?: string;
  authorAvatarValue?: string;
  authorAccentColor?: string;
  authorBubbleStyle?: string;
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
  editedAt?: Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface VoteDocument {
  _id: string;
  commentId: string;
  userTag: string;
  value: 1 | -1 | 0;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface RoomListItem {
  id: string;
  name: string;
  isCustom: boolean;
  hasPassword: boolean;
  activeMembersCount: number;
  waitingQueueCount: number;
  totalListeners: number;
  allUsers: { name: string; tag: string }[];
}
