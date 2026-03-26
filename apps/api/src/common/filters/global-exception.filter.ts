
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';
    let code = 'internal_error';

    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();

      const exceptionResponse: any = exception.getResponse();
      message = exceptionResponse.message || exception.message;

      // If the exception response has a code, use it. Otherwise, map the status.
      if (typeof exceptionResponse === 'object' && exceptionResponse.code) {
        code = exceptionResponse.code;
      } else {
        code = this.mapStatusToCode(status);
      }

      if (typeof exceptionResponse === 'object' && exceptionResponse.details) {
        details = exceptionResponse.details;
      }
    } else {
      // For non-HttpExceptions, log the error details (as they might be useful for debugging)
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );

    }

    const errorResponse = {
      error: {
        code,

        message,

        docs: `https://docs.useroutr.io/errors/${code}`,
        ...(details ? { details } : {}),
      },
    };

    response.status(status).json(errorResponse);
  }


  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'invalid_request';
      case HttpStatus.UNAUTHORIZED:
        return 'unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'unauthorized';
      case HttpStatus.NOT_FOUND:
        return 'not_found';
      case HttpStatus.CONFLICT:
        return 'quote_expired'; // Map conflict to quote_expired as per API spec for some cases
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'insufficient_liquidity';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'rate_limited';
      default:
        return 'internal_error';
    }
  }

}
