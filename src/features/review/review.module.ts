import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { PrismaModule } from 'src/core/prisma/prisma.module';
import { Mongoose } from 'mongoose';
import { UserSchema } from 'src/models/user_mongo/user/schema/user.schema';
import { ProfileUserSchema } from 'src/models/user_mongo/user/schema/profile.schema';

@Module({
    imports: [PrismaModule],
    controllers: [ReviewController],
    providers: [
        ReviewService,
        {
            provide: 'USER_MODEL',
            useFactory: (mongoose: Mongoose) => mongoose.model('user', UserSchema),
            inject: ['DATABASE_CONNECTION'],
        },
        {
            provide: 'PROFILE_MODEL',
            useFactory: (mongoose: Mongoose) => mongoose.model('profile', ProfileUserSchema),
            inject: ['DATABASE_CONNECTION'],
        },
    ],
})
export class ReviewModule {}
