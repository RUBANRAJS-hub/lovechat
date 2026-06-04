import mongoose, { Schema, Document } from 'mongoose';

export interface ICouple extends Document {
  userIds: mongoose.Types.ObjectId[];
  anniversaryDate?: Date;
  streakCount: number;
  lastActiveDate: Date;
  xp: number;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

const CoupleSchema: Schema = new Schema(
  {
    userIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    anniversaryDate: { type: Date, default: null },
    streakCount: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: Date.now },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 }
  },
  { timestamps: true }
);

export default mongoose.model<ICouple>('Couple', CoupleSchema);
