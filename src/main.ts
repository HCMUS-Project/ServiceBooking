import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    // Create a ConfigService instance
    const configService = new ConfigService();
    const port = configService.get<number>('PORT');

    // Create a microservice instance
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
        transport: Transport.GRPC,
        bufferLogs: true,
        options: {
            package: ['main', 'userToken'],
            protoPath: join(__dirname, '../src/proto/main.proto'),
            url: `0.0.0.0:${port}`,
            loader: {
                enums: String,
                objects: true,
                arrays: true,
                includeDirs: [join(__dirname, '../src/proto/')],
            },
        },
    });

    // Start the microservice
    await app.listen();
}
bootstrap();
