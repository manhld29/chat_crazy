import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let detail = "Internal server error";
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === "string") {
        detail = res;
      } else if (typeof res === "object" && res !== null) {
        detail =
          (res as any).message || (res as any).detail || JSON.stringify(res);
        if (Array.isArray(detail)) {
          detail = detail.join(", ");
        }
      }
    } else if (exception?.message) {
      detail = exception.message;
    }

    response.status(status).json({
      detail,
      statusCode: status,
    });
  }
}
