/** @param {number} amount @param {string} source @param {string} target @param {Record<string,number>} rates @returns {number|null} */
export function convertAmount(amount, source, target, rates) {
  if (!Number.isFinite(amount) || amount < 0) return null;
  if (source === target) return amount;
  const rate = rates[`${source}:${target}`];
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0 ? amount * rate : null;
}

/** @param {{amount:number,currency:string}[]} expenses @param {string} target @param {Record<string,number>} rates */
export function sumInCurrency(expenses, target, rates) {
  return expenses.reduce((sum, expense) => {
    const converted = convertAmount(expense.amount, expense.currency, target, rates);
    return sum + (converted ?? 0);
  }, 0);
}
