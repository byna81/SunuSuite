import { Controller, Get, Param } from '@nestjs/common';
import { ReceiptService } from './receipt.service';

@Controller('commerce/receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Get(':saleId')
  getReceipt(@Param('saleId') saleId: string) {
    return this.receiptService.getReceipt(saleId);
  }
}
