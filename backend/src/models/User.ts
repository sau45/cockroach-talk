import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  tag: string;
  tagNum: number;
  handle: string;
  gender?: string;
  bio?: string;
  profilePicture?: string;
  avatarType?: 'initials' | 'identicon' | 'emoji';
  avatarValue?: string;
  accentColor?: string;
  bubbleStyle?: 'sharp' | 'rounded' | 'outline';
  statusTag?: string;
  isBanned: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    tag: { type: String, required: true, unique: true, index: true },
    tagNum: { type: Number, required: true },
    handle: { type: String, required: true },
    gender: { type: String, default: 'skip' },
    bio: { type: String, default: '' },
    profilePicture: { type: String, default: '' },
    avatarType: { type: String, enum: ['initials', 'identicon', 'emoji'], default: 'initials' },
    avatarValue: { type: String, default: '' },
    accentColor: { type: String, default: 'cyber-purple' },
    bubbleStyle: { type: String, enum: ['sharp', 'rounded', 'outline'], default: 'rounded' },
    statusTag: { type: String, default: '' },
    isBanned: { type: Boolean, default: false, index: true },
    lastActiveAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
