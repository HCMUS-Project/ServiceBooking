import * as mongoose from 'mongoose';
import { User as UserInterface } from '../interface/user.interface';
import { v4 as uuidv4 } from 'uuid';
import { Role } from 'src/proto_build/auth/user_token_pb';
import { ProfileUserSchema } from './profile.schema';

export const UserSchema = new mongoose.Schema<UserInterface>(
    {
        email: {
            type: String,
            required: true,
            // unique: true,
        },
        username: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: Number,
            required: true,
            enum: Object.values(Role),
        },
        domain: {
            type: String,
            required: true,
            // unique: true,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
        is_active: {
            type: Boolean,
            default: false,
        },
        profile_id: {
            type: String,
            ref: 'profile',
        },
    },
    { timestamps: true },
);

UserSchema.index({ email: 1, domain: 1 }, { unique: true });
