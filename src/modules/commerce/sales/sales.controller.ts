import { Body, Controller, Post } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('commerce/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() body: any) {
    return this.salesService.create(body);
  }
}
