export type Expense = { amount: number; category: string };
export function budgetSummary(budget: number, expenses: Expense[]): {
  spent: number;
  remaining: number;
  percent: number;
  overBudget: boolean;
};
