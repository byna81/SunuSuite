import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('commerce/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Body()
    body: {
      tenantId: string;
      cashierId?: string | null;
      items: { productId: string; quantity: number }[];
    },
    @Req() req: any,
  ) {
    const cashierId =
      body.cashierId || req?.user?.id || req?.user?.sub || null;

    return this.salesService.create({
      tenantId: body.tenantId,
      items: body.items,
      cashierId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.salesService.findAll(tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }
}
