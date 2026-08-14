import { IsOptional, IsString } from "class-validator";

export class CreateConversationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  first_message?: string;

  @IsString()
  @IsOptional()
  personality_code?: string;

  @IsString()
  @IsOptional()
  ai_nickname?: string;
}

export class UpdateConversationDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  personality_code?: string;

  @IsString()
  @IsOptional()
  ai_nickname?: string;
}
