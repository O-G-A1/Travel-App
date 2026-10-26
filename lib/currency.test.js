import test from 'node:test';
import assert from 'node:assert/strict';
import { convertAmount, sumInCurrency } from './currency-core.js';
test('keeps amounts unchanged for the same currency',()=>assert.equal(convertAmount(42,'EUR','EUR',{}),42));
test('converts using a daily reference rate',()=>assert.equal(convertAmount(10,'EUR','USD',{'EUR:USD':1.1}),11));
test('does not invent a conversion when no rate is available',()=>assert.equal(convertAmount(10,'EUR','USD',{}),null));
test('excludes unavailable conversions from totals',()=>assert.equal(sumInCurrency([{amount:5,currency:'USD'},{amount:10,currency:'EUR'}],'USD',{}),5));
