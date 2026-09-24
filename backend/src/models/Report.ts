import mongoose, { Document, Schema } from 'mongoose';

export type ReportCategory =
  | 'harassment'
  | 'spam'
  | 'hate_speech'
  | 'inappropriate_content'
  | 'other';

export interface IReport extends Document {
  reporterTag: string;
  reportedTag: string;
  messageId?: string;
  category: ReportCategory;
  reason: string;
  note?: string;
  reporterFingerprint?: string;
  reportedFingerprint?: string;
  status: 'pending' | 'reviewed' | 'banned' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const reportSchema = new Schema<IReport>(
  {
    reporterTag: { type: String, required: true },
    reportedTag: { type: String, required: true, index: true },
    messageId: { type: String, default: null },
    category: {
      type: String,
      enum: ['harassment', 'spam', 'hate_speech', 'inappropriate_content', 'other'],
      default: 'other',
      index: true
    },
    reason: { type: String, required: true },
    note: { type: String, default: '' },
    reporterFingerprint: { type: String, default: null },
    reportedFingerprint: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'banned', 'dismissed'],
      default: 'pending',
      index: true
    }
  },
  { timestamps: true }
);

reportSchema.index({ reportedTag: 1, createdAt: -1 });
reportSchema.index({ reportedFingerprint: 1, createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
