import { describe, expect, it } from 'vitest';
import { auraFeel, bedtimeFor, computeEnergy, LEVELS, levelFor, nightKey, STEPS, todoLine } from './energy';

const fixed = (v: number) => () => v;

describe('levelFor', () => {
  it.each([
    [99, 'rainbow'],
    [85, 'rainbow'],
    [70, 'red'],
    [50, 'yellow'],
    [30, 'green'],
    [15, 'blue'],
    [3, 'grey'],
  ])('%i reads %s', (e, id) => {
    expect(levelFor(e).id).toBe(id);
  });
  it('gives every level an aura palette', () => {
    for (const l of LEVELS) expect(l.aura.colors).toHaveLength(3);
    expect(levelFor(90).aura.spectrum).toBe(true);
  });
});

describe('computeEnergy', () => {
  it('always reads Grey with the grown-up switch on', () => {
    for (const r of [0, 0.5, 0.999]) {
      const e = computeEnergy({ alwaysGrey: true, minutesToBed: 200, stepsDone: 0, stepsTotal: 5, random: fixed(r) });
      expect(levelFor(e).id).toBe('grey');
    }
  });
  it('reads high energy long before bedtime with nothing done', () => {
    const e = computeEnergy({ alwaysGrey: false, minutesToBed: 180, stepsDone: 0, stepsTotal: 5, random: fixed(0.5) });
    expect(e).toBe(99);
  });
  it('reads sleepy at bedtime with every step done', () => {
    const e = computeEnergy({ alwaysGrey: false, minutesToBed: 0, stepsDone: 5, stepsTotal: 5, random: fixed(0.5) });
    expect(e).toBeLessThan(28);
  });
  it('never says Rainbow once every step is done', () => {
    const e = computeEnergy({ alwaysGrey: false, minutesToBed: 600, stepsDone: 5, stepsTotal: 5, random: fixed(0.999) });
    expect(e).toBeLessThanOrEqual(40);
  });
  it('stays within 3..99', () => {
    expect(computeEnergy({ alwaysGrey: false, minutesToBed: -500, stepsDone: 5, stepsTotal: 5, random: fixed(0) })).toBe(3);
  });
});

describe('bedtimeFor', () => {
  it('uses tonight before bedtime', () => {
    const b = bedtimeFor(new Date(2026, 9, 21, 19, 0), '20:00');
    expect([b.getDate(), b.getHours()]).toEqual([21, 20]);
  });
  it('still uses tonight shortly after bedtime', () => {
    expect(bedtimeFor(new Date(2026, 9, 21, 22, 0), '20:00').getDate()).toBe(21);
  });
  it('moves to tomorrow the next morning', () => {
    expect(bedtimeFor(new Date(2026, 9, 22, 7, 0), '20:00').getDate()).toBe(22);
  });
  it('keeps last night\'s bedtime after midnight, so a 3am scan reads sleepy', () => {
    const now = new Date(2026, 9, 22, 3, 20);
    const b = bedtimeFor(now, '20:00');
    expect([b.getDate(), b.getHours()]).toEqual([21, 20]);
    const minutesToBed = (b.getTime() - now.getTime()) / 60e3;
    expect(minutesToBed).toBe(-440);
    expect(levelFor(computeEnergy({ alwaysGrey: false, minutesToBed, stepsDone: 0, stepsTotal: 5, random: () => 0.5 })).id).not.toBe('rainbow');
  });
  it('handles a bedtime after midnight', () => {
    const b = bedtimeFor(new Date(2026, 9, 21, 23, 0), '00:30');
    expect([b.getDate(), b.getHours(), b.getMinutes()]).toEqual([22, 0, 30]);
  });
});

describe('helpers', () => {
  it('lists the steps left', () => {
    expect(todoLine(STEPS.slice(3))).toBe('Steps left tonight: Potty, Book.'); // ES-R50
    expect(todoLine([])).toMatch(/All steps done/);
  });
  it('makes sleepy auras softer and slower', () => {
    const grey = auraFeel(5);
    const rainbow = auraFeel(95);
    expect(grey.intensity).toBeLessThan(rainbow.intensity);
    expect(grey.speed).toBeLessThan(rainbow.speed);
  });
  it('rolls the night over at 5am, local time', () => {
    expect(nightKey(new Date(2026, 9, 21, 19, 30))).toBe('steps-2026-10-21');
    expect(nightKey(new Date(2026, 9, 21, 23, 30))).toBe('steps-2026-10-21');
    expect(nightKey(new Date(2026, 9, 22, 4, 59))).toBe('steps-2026-10-21');
    expect(nightKey(new Date(2026, 9, 22, 5, 1))).toBe('steps-2026-10-22');
  });
});

describe('level texts', () => {
  it('do not repeat the level name the card already shows as its heading', () => {
    for (const level of LEVELS.filter((l) => l.id === 'grey')) {
      for (const text of level.texts) expect(text.toLowerCase().startsWith('grey')).toBe(false);
    }
  });
});
