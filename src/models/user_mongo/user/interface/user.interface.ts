import { Document } from 'mongoose';
import { Profile } from './profile.interface';
import { Role } from 'src/proto_build/auth/user_token_pb';

export interface User extends Document {
    readonly email: string;
    readonly username: string;
    readonly password: string;
    readonly role: Role;
    readonly domain: string;
    readonly is_deleted: boolean;
    readonly is_active: boolean;
    readonly profile_id: Profile | string;
}
