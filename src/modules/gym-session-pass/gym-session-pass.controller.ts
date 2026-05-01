import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { GymSessionPassService } from "./gym-session-pass.service";

@Controller("gym-session-passes")
export class GymSessionPassController {
  constructor(private readonly service: GymSessionPassService) {}

  @Post()
  create(@Query("tenantId") tenantId: string, @Body() body: any) {
    return this.service.create(tenantId, body);
  }

  @Post("use")
  usePass(@Query("tenantId") tenantId: string, @Body() body: any) {
    return this.service.use(body.qrCode, tenantId);
  }

  @Get("validate/:qrCode")
  validate(@Param("qrCode") qrCode: string, @Query("tenantId") tenantId: string) {
    return this.service.validate(qrCode, tenantId);
  }

  @Get()
  findAll(@Query("tenantId") tenantId: string) {
    return this.service.findAll(tenantId);
  }
}
