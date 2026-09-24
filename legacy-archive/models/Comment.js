import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  authorTag: { type: String, required: true },
  authorName: { type: String, required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  rootId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
  depth: { type: Number, default: 0, max: 6 },
  body: { type: String, required: true, maxlength: 1000 },
  score: { type: Number, default: 0 },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  replyCount: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  editedAt: { type: Date, default: null }
}, { timestamps: true });

commentSchema.index({ roomId: 1, parentId: 1, createdAt: -1 });
commentSchema.index({ roomId: 1, parentId: 1, score: -1 });
commentSchema.index({ rootId: 1, createdAt: 1 });

export default mongoose.model('Comment', commentSchema);
