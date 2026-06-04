import mongoose, { Schema, Document } from 'mongoose';

export interface ICallHistory extends Document {
  coupleId: mongoose.Types.ObjectId;
  callerId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  callType: 'voice' | 'video';
  status: 'missed' | 'answered' | 'declined' | 'busy';
  duration: number; // in seconds
  startedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CallHistorySchema: Schema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    callerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    callType: { type: String, enum: ['voice', 'video'], required: true },
    status: { type: String, enum: ['missed', 'answered', 'declined', 'busy'], required: true },
    duration: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<ICallHistory>('CallHistory', CallHistorySchema);
