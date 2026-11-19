import { Injectable } from '@nestjs/common';
import { BudgetItem } from './budget-item.model';
import { BudgetItemLogicI, BudgetItemRepositoryI } from './budget-item.ports';

@Injectable()
export class BudgetItemLogic implements BudgetItemLogicI {
  constructor(private readonly budgetItemRepository: BudgetItemRepositoryI) {}

  async getBudgetItems(): Promise<BudgetItem[]> {
    return await this.budgetItemRepository.findAll();
  }
}
