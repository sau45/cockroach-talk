import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVote extends Document {
  commentId: Types.ObjectId;
  userTag: string;
  value: 1 | -1 | 0;
  createdAt: Date;
  updatedAt: Date;
}

const voteSchema = new Schema<IVote>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true },
    userTag: { type: String, required: true },
    value: { type: Number, enum: [1, -1, 0], required: true }
  },
  { timestamps: true }
);

voteSchema.index({ commentId: 1, userTag: 1 }, { unique: true });

export const Vote = mongoose.model<IVote>('Vote', voteSchema);
