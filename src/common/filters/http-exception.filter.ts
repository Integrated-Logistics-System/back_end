import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export default class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 클라이언트 IP 주소 가져오기 (프록시를 고려하여 x-forwarded-for 헤더 확인)
    const xForwardedFor = request.headers['x-forwarded-for'];
    const clientIp = Array.isArray(xForwardedFor)
      ? xForwardedFor[0]
      : xForwardedFor || request.connection.remoteAddress || 'unknown';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ip: clientIp,
      message: exception.message || '서버 오류가 발생했습니다',
    };

    this.logger.error(
      `${request.method} ${request.url} ${status} - IP: ${clientIp} - ${exception.message}`,
      exception.stack,
    );

    response.status(status).json(errorResponse);
  }
}
