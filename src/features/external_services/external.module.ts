import { Module } from '@nestjs/common';
import { ClientProxyFactory, ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ConfigService } from '@nestjs/config'; 
import { ProfileUserService } from './profileUsers/profile.service';
@Module({
    imports: [ClientsModule],
    providers: [
        {
            provide: 'GRPC_TENANT_AUTH',
            useFactory: (configService: ConfigService) => {
                return ClientProxyFactory.create({
                    transport: Transport.GRPC,
                    options: {
                        package: ['profile'],
                        protoPath: join(__dirname, '../../../src/proto/main.proto'),
                        url: configService.get<string>('AUTH_SERVICE_URL'),
                        loader: {
                            enums: String,
                            objects: true,
                            arrays: true,
                            includeDirs: [join(__dirname, '../../../src/proto/')],
                        },
                    },
                });
            },
            inject: [ConfigService],
        }, 
    ],
    exports: ['GRPC_TENANT_AUTH'],
})
export class ExternalServiceModule {}
