/** @param {number} budget @param {{amount:number,category:string}[]} expenses */
export function budgetSummary(budget, expenses) {
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return {
    spent,
    remaining: budget - spent,
    percent: budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0,
    overBudget: spent > budget
  };
}
