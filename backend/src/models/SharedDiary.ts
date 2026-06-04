import mongoose, { Schema, Document } from 'mongoose';

export interface ISharedDiary extends Document {
  coupleId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  content: string;
  mood: 'happy' | 'romantic' | 'sad' | 'angry' | 'neutral' | 'excited';
  isPrivate: boolean;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SharedDiarySchema: Schema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    mood: { 
      type: String, 
      enum: ['happy', 'romantic', 'sad', 'angry', 'neutral', 'excited'], 
      required: true 
    },
    isPrivate: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<ISharedDiary>('SharedDiary', SharedDiarySchema);
