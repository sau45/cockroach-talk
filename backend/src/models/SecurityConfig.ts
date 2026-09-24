import mongoose, { Document, Schema } from 'mongoose';

export interface ISecurityConfig extends Document {
  configKey: string;
  toxicityMuteThreshold: number; // e.g. 0.80
  toxicityFlagThreshold: number; // e.g. 0.50
  strikeDecayDays: number; // e.g. 30 days per strike decay
  muteDurationStrike2Hours: number; // e.g. 1 hour
  muteDurationStrike3Hours: number; // e.g. 24 hours
  banStrikeThreshold: number; // e.g. 4 strikes -> shadow ban
  burstMaxMessages: number; // e.g. 3 msgs
  burstWindowSeconds: number; // e.g. 2 seconds
  honeypotJoinDelaySeconds: number; // e.g. 10 seconds
  updatedAt: Date;
}

const securityConfigSchema = new Schema<ISecurityConfig>(
  {
    configKey: { type: String, required: true, unique: true, default: 'global' },
    toxicityMuteThreshold: { type: Number, default: 0.80, min: 0.1, max: 1.0 },
    toxicityFlagThreshold: { type: Number, default: 0.50, min: 0.1, max: 1.0 },
    strikeDecayDays: { type: Number, default: 30, min: 1, max: 365 },
    muteDurationStrike2Hours: { type: Number, default: 1, min: 0.1 },
    muteDurationStrike3Hours: { type: Number, default: 24, min: 0.5 },
    banStrikeThreshold: { type: Number, default: 4, min: 1, max: 20 },
    burstMaxMessages: { type: Number, default: 3, min: 1, max: 20 },
    burstWindowSeconds: { type: Number, default: 2, min: 1, max: 60 },
    honeypotJoinDelaySeconds: { type: Number, default: 10, min: 1, max: 120 }
  },
  { timestamps: true }
);

export const SecurityConfig = mongoose.model<ISecurityConfig>('SecurityConfig', securityConfigSchema);
