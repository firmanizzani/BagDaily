import {describe,it,expect} from 'vitest';
import {profitFigures} from '../src/modules/reports/profit-rules.js';
describe('sales profit rules',()=>{
 it('uses payment less shipping; a redeemed discount must not be subtracted twice',()=>{
  const payment=380000+15000-5000;
  expect(profitFigures(payment-15000,295000,0)).toEqual({profit:80000,marginPercent:21.33});
 });
 it('does not invent profit for missing purchase costs',()=>{
  expect(profitFigures(230000,0,1)).toEqual({profit:null,marginPercent:null});
 });
 it('preserves losses and avoids dividing by zero for fully redeemed purchases',()=>{
  expect(profitFigures(0,80000,0)).toEqual({profit:-80000,marginPercent:null});
  expect(profitFigures(100000,110000,0)).toEqual({profit:-10000,marginPercent:-10});
 });
});
