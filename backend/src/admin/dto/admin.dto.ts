import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

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

export class UpdateModelConfigDto {
  @IsBoolean()
  @IsNotEmpty()
  manual_mode: boolean;

  @IsString()
  @IsOptional()
  selected_model?: string;
}

export class UpdateUserStatusDto {
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}

export class UpdateUserRoleDto {
  @IsBoolean()
  @IsNotEmpty()
  is_admin: boolean;
}

export class CreateAdminAccountDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsOptional()
  display_name?: string;
}
