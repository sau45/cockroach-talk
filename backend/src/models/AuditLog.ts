import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  action:
    | 'auto_warn'
    | 'auto_mute'
    | 'auto_shadow_ban'
    | 'auto_hard_ban'
    | 'auto_flag'
    | 'user_report'
    | 'override_unban'
    | 'override_unmute'
    | 'override_strike'
    | 'override_shadow_to_hard'
    | 'threshold_update';
  triggerReason:
    | 'toxicity'
    | 'burst_flood'
    | 'duplicate_spam'
    | 'honeypot_link'
    | 'admin_manual'
    | 'harassment'
    | 'spam'
    | 'hate_speech'
    | 'inappropriate_content'
    | 'other'
    | 'user_reports_accumulation';
  confidenceScore?: number;
  targetTag?: string;
  fingerprint: string;
  ipHash?: string;
  details?: string;
  metadata?: any;
  reversed: boolean;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: {
      type: String,
      enum: [
        'auto_warn',
        'auto_mute',
        'auto_shadow_ban',
        'auto_hard_ban',
        'auto_flag',
        'user_report',
        'override_unban',
        'override_unmute',
        'override_strike',
        'override_shadow_to_hard',
        'threshold_update'
      ],
      required: true,
      index: true
    },
    triggerReason: {
      type: String,
      enum: [
        'toxicity',
        'burst_flood',
        'duplicate_spam',
        'honeypot_link',
        'admin_manual',
        'harassment',
        'spam',
        'hate_speech',
        'inappropriate_content',
        'other',
        'user_reports_accumulation'
      ],
      required: true,
      index: true
    },
    confidenceScore: { type: Number },
    targetTag: { type: String, index: true },
    fingerprint: { type: String, required: true, index: true },
    ipHash: { type: String },
    details: { type: String },
    metadata: { type: Schema.Types.Mixed },
    reversed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
