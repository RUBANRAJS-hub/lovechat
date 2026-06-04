import mongoose, { Schema, Document } from 'mongoose';

export interface IGameSession extends Document {
  coupleId: mongoose.Types.ObjectId;
  gameType: 'quiz' | 'truth-or-dare' | 'compatibility' | 'love-language' | 'spin-wheel' | 'memory-match' | 'daily-challenge';
  status: 'pending' | 'completed';
  gameState: Record<string, any>;
  results: Record<string, any>;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GameSessionSchema: Schema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    gameType: { 
      type: String, 
      enum: ['quiz', 'truth-or-dare', 'compatibility', 'love-language', 'spin-wheel', 'memory-match', 'daily-challenge'], 
      required: true 
    },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    gameState: { type: Schema.Types.Map, of: Schema.Types.Mixed, default: {} },
    results: { type: Schema.Types.Map, of: Schema.Types.Mixed, default: {} },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<IGameSession>('GameSession', GameSessionSchema);
