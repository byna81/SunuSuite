import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { GymSessionPassService } from "./gym-session-pass.service";

@Controller("gym-session-passes")
export class GymSessionPassController {
  constructor(private readonly service: GymSessionPassService) {}

  @Post()
  create(@Query("tenantId") tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Get("validate/:qrCode")
  validate(@Param("qrCode") qrCode: string, @Query("tenantId") tenantId: string) {
    return this.service.validate(qrCode, tenantId);
  }

  @Patch("use/:qrCode")
  use(@Param("qrCode") qrCode: string, @Query("tenantId") tenantId: string) {
    return this.service.use(qrCode, tenantId);
  }
}
