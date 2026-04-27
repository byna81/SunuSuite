import { Module } from '@nestjs/common';
import { GymExpensesController } from './gym-expenses.controller';
import { GymExpensesService } from './gym-expenses.service';

@Module({
  controllers: [GymExpensesController],
  providers: [GymExpensesService],
})
export class GymExpensesModule {}
