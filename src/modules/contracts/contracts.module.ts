import { Module } from '@nestjs/common';
import { SubscriptionContractService } from './subscription-contract.service';

@Module({
  providers: [SubscriptionContractService],
  exports: [SubscriptionContractService],
})
export class ContractsModule {}
