import { Body, Controller, Post } from '@nestjs/common';
import { ReturnsService } from './returns.service';

@Controller('commerce/returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  createReturn(
    @Body()
    body: {
      saleId: string;
      tenantId: string;
      items: {
        productId: string;
        quantity: number;
        restock?: boolean;
      }[];
      reason?: string;
      refundMethod: string;
    },
  ) {
    return this.returnsService.createReturn(body);
  }
}
