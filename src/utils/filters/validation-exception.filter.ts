import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Handle validation errors (array of messages)
    let message: string;
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      const messages = exceptionResponse.message;
      if (Array.isArray(messages)) {
        // Join array of validation messages into a single string
        message = messages[0];
      } else if (typeof messages === 'string') {
        message = messages;
      } else {
        message = 'Validation failed';
      }
    } else {
      message = 'Validation failed';
    }

    response.status(status).json({
      message,
      data: null,
    });
  }
}