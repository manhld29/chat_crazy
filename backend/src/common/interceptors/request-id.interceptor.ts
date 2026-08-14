import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import * as crypto from "crypto";
import { Observable } from "rxjs";

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const requestId =
      (request.headers["x-request-id"] as string) || crypto.randomUUID();
    request.requestId = requestId;
    response.setHeader("X-Request-ID", requestId);

    return next.handle();
  }
}
