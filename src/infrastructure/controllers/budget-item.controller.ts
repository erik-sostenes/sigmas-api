import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { BudgetItemLogicI } from '../../business/budget-item.ports';
import { BudgetItem } from '../../business/budget-item.model';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';

@Controller('api/v1/budget-items')
@UseGuards(ClerkAuthGuard)
export class BudgetItemController {
  constructor(private readonly budgetItemLogic: BudgetItemLogicI) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getBudgetItems(): Promise<BudgetItem[]> {
    return await this.budgetItemLogic.getBudgetItems();
  }
}
