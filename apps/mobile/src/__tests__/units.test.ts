import {
  kgToLb,
  lbToKg,
  kmToMiles,
  milesToKm,
  mToFt,
  ftToM,
  formatWeight,
  formatDistance,
  formatDuration,
} from '@fitcore/utils';

describe('Unit Conversion and Measurement Utilities (Day 13)', () => {
  describe('Weight Conversions (KG <-> LB)', () => {
    it('accurately converts 100 kg to lbs and back', () => {
      const lbs = kgToLb(100);
      expect(lbs).toBeCloseTo(220.46, 1);

      const kg = lbToKg(lbs);
      expect(kg).toBeCloseTo(100, 1);
    });

    it('accurately converts zero and handles NaN', () => {
      expect(kgToLb(0)).toBe(0);
      expect(lbToKg(0)).toBe(0);
      expect(kgToLb(NaN)).toBe(0);
      expect(lbToKg(NaN)).toBe(0);
    });

    it('formats weight strings correctly', () => {
      expect(formatWeight(80, 'KG')).toBe('80 KG');
      expect(formatWeight(176.4, 'LB')).toBe('176.4 LB');
      expect(formatWeight(null)).toBe('-');
      expect(formatWeight(undefined)).toBe('-');
    });
  });

  describe('Distance Conversions (KM <-> Miles, M <-> FT)', () => {
    it('accurately converts 10 km to miles and back', () => {
      const miles = kmToMiles(10);
      expect(miles).toBeCloseTo(6.21, 1);

      const km = milesToKm(miles);
      expect(km).toBeCloseTo(10, 1);
    });

    it('accurately converts 100 meters to feet and back', () => {
      const ft = mToFt(100);
      expect(ft).toBeCloseTo(328.08, 1);

      const m = ftToM(ft);
      expect(m).toBeCloseTo(100, 1);
    });

    it('formats distance correctly', () => {
      expect(formatDistance(5, 'KM')).toBe('5 KM');
      expect(formatDistance(3.1, 'MI')).toBe('3.1 MI');
      expect(formatDistance(null)).toBe('-');
    });
  });

  describe('Duration Formatting', () => {
    it('formats seconds into human readable duration', () => {
      expect(formatDuration(45)).toBe('45s');
      expect(formatDuration(120)).toBe('2m');
      expect(formatDuration(125)).toBe('2m 5s');
      expect(formatDuration(0)).toBe('0s');
      expect(formatDuration(null)).toBe('-');
    });
  });
});
