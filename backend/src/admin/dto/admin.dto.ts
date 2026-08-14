import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class UpdateUserLimitDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  daily_message_limit?: number | null;
}
