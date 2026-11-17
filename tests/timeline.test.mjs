import test from 'node:test';
import assert from 'node:assert/strict';
import { cueAt, incidentFrame, incidents, smooth } from '../src/timeline.ts';

test('all four incidents have authored escalation and a complete reset', () => {
  assert.deepEqual(incidents.map(item => item.kind), ['sneeze', 'parade', 'gravity', 'comet']);
  const peaks = [[.87, 'sneeze'], [3, 'parade'], [3.4, 'gravity'], [3.2, 'comet']];
  peaks.forEach(([time, effect], index) => {
    const frame = incidentFrame(index, time);
    assert.equal(frame.active, true);
    assert.equal(frame[effect], 1);
    assert.equal(incidentFrame(index, incidents[index].duration).active, false);
    assert.ok(Object.entries(incidentFrame(index, incidents[index].duration)).every(([key, value]) => key === 'active' || value === 0));
  });
  assert.equal(incidentFrame(0, 2.1).shower, 1);
});

test('discovery cue waits for the cinematic introduction and clears', () => {
  assert.equal(cueAt(20.9), '');
  assert.match(cueAt(21), /moon/);
  assert.equal(cueAt(27), '');
  assert.equal(smooth(1, 3, 0), 0);
  assert.equal(smooth(1, 3, 2), .5);
  assert.equal(smooth(1, 3, 4), 1);
});
