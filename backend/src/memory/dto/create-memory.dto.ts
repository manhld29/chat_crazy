import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class CreateMemoryDto {
  @IsString()
  @IsNotEmpty()
  memory_key: string;

  @IsString()
  @IsNotEmpty()
  memory_value: string;

  @IsString()
  @IsIn([
    "addressing",
    "communication_style",
    "interest",
    "user_requested",
    "inside_joke",
    "other",
  ])
  category: string;
}
