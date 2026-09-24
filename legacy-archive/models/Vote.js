import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema({
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
  userTag: { type: String, required: true },
  value: { type: Number, enum: [1, -1, 0], required: true }
}, { timestamps: true });

voteSchema.index({ commentId: 1, userTag: 1 }, { unique: true });

export default mongoose.model('Vote', voteSchema);
