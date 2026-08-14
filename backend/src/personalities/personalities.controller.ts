import { Controller, Get } from "@nestjs/common";
import { PersonalitiesService } from "./personalities.service";

@Controller("personalities")
export class PersonalitiesController {
  constructor(private readonly personalitiesService: PersonalitiesService) {}

  @Get()
  findAll() {
    return this.personalitiesService.findAll();
  }
}
