import mongoose, { Schema, Document } from 'mongoose';

export interface ISharedGoal extends Document {
  coupleId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: 'travel' | 'money' | 'movie' | 'custom';
  targetValue: number;
  currentValue: number;
  status: 'active' | 'completed';
  rewardBadge?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SharedGoalSchema: Schema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    category: { type: String, enum: ['travel', 'money', 'movie', 'custom'], default: 'custom' },
    targetValue: { type: Number, required: true, default: 1 },
    currentValue: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    rewardBadge: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

export default mongoose.model<ISharedGoal>('SharedGoal', SharedGoalSchema);
