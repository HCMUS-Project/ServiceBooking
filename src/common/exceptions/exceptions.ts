/**
 * Represents a custom exception that is thrown when a client request is malformed or invalid.
 * Extends the HttpException class from the '@nestjs/microservices' module.
 */
import { RpcException } from '@nestjs/microservices';

class GrpcItemNotFoundException extends RpcException {
    constructor(itemName: string) {
        super(`${itemName}`);
        this.message = JSON.stringify({
            error: this.message,
            type: 'string',
            exceptionName: 'RpcException',
        });
    }
}

class GrpcItemExitException extends RpcException {
    constructor(itemName: string) {
        super(`${itemName}`);
        this.message = JSON.stringify({
            error: this.message,
            type: 'string',
            exceptionName: 'RpcException',
        });
    }
}

class GrpcInvalidArgumentException extends RpcException {
    constructor(error: string | object) {
        super(`${error}`);
        this.message = JSON.stringify({
            error: this.message,
            type: 'string',
            exceptionName: 'RpcException',
        });
    }
}

export { GrpcItemNotFoundException, GrpcItemExitException, GrpcInvalidArgumentException };
