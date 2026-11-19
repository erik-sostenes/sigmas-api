import { BudgetItem } from './budget-item.model';

export abstract class BudgetItemLogicI {
  abstract getBudgetItems(): Promise<BudgetItem[]>;
}

export abstract class BudgetItemRepositoryI {
  abstract findAll(): Promise<BudgetItem[]>;
}
