import test from 'node:test';
import assert from 'node:assert/strict';
import { budgetSummary } from './budget-core.js';
test('summarizes planned spend',()=>assert.deepEqual(budgetSummary(100,[{amount:25,category:'food'},{amount:30,category:'stay'}]),{spent:55,remaining:45,percent:55,overBudget:false}));
test('caps display progress but retains negative remaining',()=>assert.deepEqual(budgetSummary(50,[{amount:65,category:'stay'}]),{spent:65,remaining:-15,percent:100,overBudget:true}));
test('handles a zero budget',()=>assert.deepEqual(budgetSummary(0,[]),{spent:0,remaining:0,percent:0,overBudget:false}));
