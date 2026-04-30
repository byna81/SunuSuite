import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { GymAccessService } from './gym-access.service';

@Controller('gym-access')
export class GymAccessController {
  constructor(private readonly service: GymAccessService) {}

  @Post('use')
  usePass(@Query('tenantId') tenantId: string, @Body() body: any) {
    return this.service.usePass(tenantId, body);
  }

  @Get('check')
  async check(@Query('qrCode') qrCode: string) {
    if (!qrCode) throw new BadRequestException('qrCode obligatoire');
    return this.service.check(qrCode);
  }
}
