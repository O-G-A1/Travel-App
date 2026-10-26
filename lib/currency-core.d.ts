export function convertAmount(amount:number, source:string, target:string, rates:Record<string,number>):number|null;
export function sumInCurrency(expenses:{amount:number;currency:string}[], target:string, rates:Record<string,number>):number;
