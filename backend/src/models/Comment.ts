import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IComment extends Document {
  roomId: string;
  authorTag: string;
  authorName: string;
  authorAvatarType?: 'initials' | 'identicon' | 'emoji';
  authorAvatarValue?: string;
  authorAccentColor?: string;
  authorBubbleStyle?: 'sharp' | 'rounded' | 'outline';
  authorStatus?: string;
  parentId: Types.ObjectId | null;
  rootId: Types.ObjectId | null;
  depth: number;
  body: string;
  score: number;
  upvotes: number;
  downvotes: number;
  replyCount: number;
  isDeleted: boolean;
  isShadowBanned: boolean;
  toxicityScore?: number;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    roomId: { type: String, required: true, index: true },
    authorTag: { type: String, required: true },
    authorName: { type: String, required: true },
    authorAvatarType: { type: String, default: 'initials' },
    authorAvatarValue: { type: String, default: '' },
    authorAccentColor: { type: String, default: 'cyber-purple' },
    authorBubbleStyle: { type: String, default: 'rounded' },
    authorStatus: { type: String, default: '' },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    rootId: { type: Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    depth: { type: Number, default: 0, max: 6 },
    body: { type: String, required: true, maxlength: 1000 },
    score: { type: Number, default: 0 },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    replyCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    isShadowBanned: { type: Boolean, default: false, index: true },
    toxicityScore: { type: Number, default: 0 },
    editedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

commentSchema.index({ roomId: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ roomId: 1, parentId: 1, score: -1 });
commentSchema.index({ rootId: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
