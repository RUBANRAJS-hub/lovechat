import mongoose, { Schema, Document } from 'mongoose';

export interface IReaction {
  userId: mongoose.Types.ObjectId;
  emoji: string;
}

export interface IMessage extends Document {
  coupleId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  recipientId: mongoose.Types.ObjectId;
  encryptedContent: string; // AES-GCM ciphertext
  iv: string; // Initialization Vector (base64)
  encryptedKeySender: string; // AES Key wrapped with sender's public RSA key (base64)
  encryptedKeyRecipient: string; // AES Key wrapped with recipient's public RSA key (base64)
  mediaUrl?: string; // Cloudinary URL if attachment exists
  mediaType?: 'text' | 'image' | 'video' | 'voice' | 'document' | 'gif' | 'sticker';
  reactions: IReaction[];
  replyTo?: mongoose.Types.ObjectId;
  isEdited: boolean;
  isDeleted: boolean; // Delete for everyone
  isDeletedFor: mongoose.Types.ObjectId[]; // Delete for self
  isPinned: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    coupleId: { type: Schema.Types.ObjectId, ref: 'Couple', required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    encryptedContent: { type: String, required: true },
    iv: { type: String, required: true },
    encryptedKeySender: { type: String, required: true },
    encryptedKeyRecipient: { type: String, required: true },
    mediaUrl: { type: String, default: null },
    mediaType: { 
      type: String, 
      enum: ['text', 'image', 'video', 'voice', 'document', 'gif', 'sticker'], 
      default: 'text' 
    },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String }
      }
    ],
    replyTo: { type: Schema.Types.ObjectId, ref: 'Message', default: null },
    isEdited: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    isDeletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isPinned: { type: Boolean, default: false },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>('Message', MessageSchema);
