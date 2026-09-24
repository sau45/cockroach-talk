import mongoose, { Document, Schema } from 'mongoose';

export interface IStrikeRecord {
  id: string;
  reason: 'toxicity' | 'burst_flood' | 'duplicate_spam' | 'honeypot_link' | 'admin_manual';
  score?: number;
  actionTaken: 'warning' | 'mute' | 'shadow_ban' | 'hard_ban';
  details?: string;
  timestamp: Date;
}

export interface IDeviceSecurity extends Document {
  fingerprint: string;
  ipHash: string;
  associatedTags: string[];
  associatedSessions: string[];
  rawStrikes: number;
  effectiveStrikes: number;
  lastStrikeAt?: Date;
  currentPenalty: 'none' | 'warning' | 'mute' | 'ban';
  penaltyExpiresAt?: Date | null;
  isShadowBanned: boolean;
  isHardBanned: boolean;
  trustScore: number; // 0 - 100
  strikeHistory: IStrikeRecord[];
  firstSeenAt: Date;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const strikeRecordSchema = new Schema<IStrikeRecord>(
  {
    id: { type: String, required: true },
    reason: {
      type: String,
      enum: ['toxicity', 'burst_flood', 'duplicate_spam', 'honeypot_link', 'admin_manual'],
      required: true
    },
    score: { type: Number },
    actionTaken: {
      type: String,
      enum: ['warning', 'mute', 'shadow_ban', 'hard_ban'],
      required: true
    },
    details: { type: String },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const deviceSecuritySchema = new Schema<IDeviceSecurity>(
  {
    fingerprint: { type: String, required: true, unique: true, index: true },
    ipHash: { type: String, required: true, index: true },
    associatedTags: [{ type: String, index: true }],
    associatedSessions: [{ type: String }],
    rawStrikes: { type: Number, default: 0 },
    effectiveStrikes: { type: Number, default: 0 },
    lastStrikeAt: { type: Date },
    currentPenalty: {
      type: String,
      enum: ['none', 'warning', 'mute', 'ban'],
      default: 'none',
      index: true
    },
    penaltyExpiresAt: { type: Date, default: null },
    isShadowBanned: { type: Boolean, default: false, index: true },
    isHardBanned: { type: Boolean, default: false, index: true },
    trustScore: { type: Number, default: 100, min: 0, max: 100 },
    strikeHistory: [strikeRecordSchema],
    firstSeenAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const DeviceSecurity = mongoose.model<IDeviceSecurity>('DeviceSecurity', deviceSecuritySchema);
