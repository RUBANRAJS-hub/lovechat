import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password?: string;
  profilePhoto: string;
  bio: string;
  pairingCode?: string;
  pairingCodeExpiresAt?: Date;
  partnerId?: mongoose.Types.ObjectId;
  coupleId?: mongoose.Types.ObjectId;
  publicKey?: string;
  encryptedPrivateKey?: string;
  privateKeySalt?: string;
  otp?: string;
  otpExpiresAt?: Date;
  isVerified: boolean;
  fcmToken?: string;
  lastActive: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String },
    profilePhoto: { type: String, default: "" },
    bio: { type: String, default: "" },
    pairingCode: { type: String, default: null },
    pairingCodeExpiresAt: { type: Date, default: null },
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    coupleId: { type: Schema.Types.ObjectId, ref: 'Couple', default: null },
    publicKey: { type: String, default: null },
    encryptedPrivateKey: { type: String, default: null },
    privateKeySalt: { type: String, default: null },
    otp: { type: String, default: null },
    otpExpiresAt: { type: Date, default: null },
    isVerified: { type: Boolean, default: false },
    fcmToken: { type: String, default: null },
    lastActive: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
