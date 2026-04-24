import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { GymAccessService } from './gym-access.service';

@Controller('gym-access')
export class GymAccessController {
  constructor(private readonly service: GymAccessService) {}

  @Get('check')
  async check(@Query('qrCode') qrCode: string) {
    if (!qrCode) throw new BadRequestException('qrCode obligatoire');
    return this.service.check(qrCode);
  }
}
