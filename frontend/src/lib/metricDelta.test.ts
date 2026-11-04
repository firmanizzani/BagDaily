import {describe,it,expect} from 'vitest';
import {metricDelta} from './metricDelta';
describe('metric month changes',()=>{
 it('distinguishes increases, decreases and equal values',()=>{
  expect(metricDelta(120,100)).toEqual({direction:'up',percentage:20});
  expect(metricDelta(80,100)).toEqual({direction:'down',percentage:20});
  expect(metricDelta(100,100)).toEqual({direction:'flat',percentage:0});
 });
 it('does not invent a percentage from zero or missing data',()=>{
  expect(metricDelta(10,0)).toEqual({direction:'up',percentage:null});
  expect(metricDelta(0,0)).toEqual({direction:'flat',percentage:0});
  expect(metricDelta(null,20)).toEqual({direction:'unavailable',percentage:null});
 });
 it('treats a smaller loss as an increase and a larger loss as a decrease',()=>{
  expect(metricDelta(-50,-100)).toEqual({direction:'up',percentage:50});
  expect(metricDelta(-150,-100)).toEqual({direction:'down',percentage:50});
 });
});
