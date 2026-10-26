import test from 'node:test';
import assert from 'node:assert/strict';
import { isItineraryWithinTrip } from './itinerary-core.js';

const valid = (date = '2026-11-18', title = 'Visit a market') => ({ date, time: '10:30', title, place: 'Central market' });

test('accepts valid activities on trip dates', () => assert.equal(isItineraryWithinTrip([valid()], '2026-11-18', '2026-11-20'), true));
test('rejects activities outside trip dates', () => assert.equal(isItineraryWithinTrip([valid('2026-11-21')], '2026-11-18', '2026-11-20'), false));
test('limits itinerary drafts to three activities per day', () => assert.equal(isItineraryWithinTrip([valid(), valid('2026-11-18', 'Second idea'), valid('2026-11-18', 'Third idea'), valid('2026-11-18', 'Fourth idea')], '2026-11-18', '2026-11-20'), false));
test('rejects invalid dates and times', () => assert.equal(isItineraryWithinTrip([{ ...valid(), date: '2026-02-30' }], '2026-01-01', '2026-12-31'), false));
test('rejects empty or oversized drafts', () => {
  assert.equal(isItineraryWithinTrip([], '2026-11-18', '2026-11-20'), false);
  assert.equal(isItineraryWithinTrip(Array.from({ length: 31 }, (_, i) => valid(`2026-11-${String(18 + Math.floor(i / 3)).padStart(2, '0')}`, `Activity ${i}`)), '2026-11-18', '2026-11-30'), false);
});
