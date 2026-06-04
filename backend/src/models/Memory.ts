import mongoose, { Schema, Document } from 'mongoose';

export interface IMemory extends Document {
  coupleId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio';
  category: 'normal' | 'travel' | 'secret';
  date: Date;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema: Schema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video', 'audio'], required: true },
    category: { type: String, enum: ['normal', 'travel', 'secret'], default: 'normal' },
    date: { type: Date, default: Date.now },
    tags: [{ type: String, trim: true }]
  },
  { timestamps: true }
);

export default mongoose.model<IMemory>('Memory', MemorySchema);
