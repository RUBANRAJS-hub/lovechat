import mongoose, { Schema, Document } from 'mongoose';

export interface ITimelineEvent extends Document {
  coupleId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: Date;
  category: 'meet' | 'chat' | 'photo' | 'date' | 'anniversary' | 'other';
  mediaUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TimelineEventSchema: Schema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    date: { type: Date, required: true },
    category: { 
      type: String, 
      enum: ['meet', 'chat', 'photo', 'date', 'anniversary', 'other'], 
      default: 'other' 
    },
    mediaUrl: { type: String, default: null }
  },
  { timestamps: true }
);

export default mongoose.model<ITimelineEvent>('TimelineEvent', TimelineEventSchema);
