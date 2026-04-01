import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';

@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly service: AppSettingsService) {}

  @Get('public-payment')
  findPublicPaymentSettings() {
    return this.service.findPublicPaymentSettings();
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post('bulk')
  upsertMany(@Body() body: any) {
    return this.service.upsertMany(body);
  }
}
