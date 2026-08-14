import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class ChatStreamDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  client_message_id: string;

  @IsString()
  @IsOptional()
  retry_from_message_id?: string | null;
}
