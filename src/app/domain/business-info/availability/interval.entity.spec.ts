import { Interval } from './interval.entity';

describe('Interval Entity', () => {
  describe('Constructor', () => {
    it('should create a valid interval', () => {
      const interval = new Interval('09:00', '14:00');

      expect(interval.open).toBe('09:00');
      expect(interval.close).toBe('14:00');
    });

    it('should accept single-digit hours', () => {
      const interval = new Interval('9:00', '14:00');

      expect(interval.open).toBe('9:00');
    });

    it('should throw error for invalid open time format', () => {
      expect(() => new Interval('25:00', '14:00')).toThrowError(
        /Formato de tiempo inválido/
      );
    });

    it('should throw error for invalid close time format', () => {
      expect(() => new Interval('09:00', '14:60')).toThrowError(
        /Formato de tiempo inválido/
      );
    });

    it('should throw error for completely invalid format', () => {
      expect(() => new Interval('abc', '14:00')).toThrowError(
        /Formato de tiempo inválido/
      );
    });

    it('should throw error for missing minutes', () => {
      expect(() => new Interval('09', '14:00')).toThrowError(
        /Formato de tiempo inválido/
      );
    });
  });

  describe('getDurationInMinutes()', () => {
    it('should calculate duration correctly', () => {
      const interval = new Interval('09:00', '14:00');

      expect(interval.getDurationInMinutes()).toBe(300); // 5 hours
    });

    it('should handle single-hour intervals', () => {
      const interval = new Interval('10:00', '11:00');

      expect(interval.getDurationInMinutes()).toBe(60);
    });

    it('should handle intervals with minutes', () => {
      const interval = new Interval('09:30', '11:45');

      expect(interval.getDurationInMinutes()).toBe(135); // 2h 15m
    });

    it('should handle negative duration (invalid interval)', () => {
      // Note: Constructor allows this, but isValid() catches it
      const interval = new Interval('14:00', '09:00');

      expect(interval.getDurationInMinutes()).toBe(-300);
    });
  });

  describe('isValid()', () => {
    it('should return true for valid interval', () => {
      const interval = new Interval('09:00', '14:00');

      expect(interval.isValid()).toBeTrue();
    });

    it('should return false when close is before open', () => {
      const interval = new Interval('14:00', '09:00');

      expect(interval.isValid()).toBeFalse();
    });

    it('should return false when open equals close', () => {
      const interval = new Interval('12:00', '12:00');

      expect(interval.isValid()).toBeFalse();
    });
  });

  describe('contains()', () => {
    it('should return true for time within interval', () => {
      const interval = new Interval('09:00', '14:00');

      expect(interval.contains('10:00')).toBeTrue();
      expect(interval.contains('12:30')).toBeTrue();
      expect(interval.contains('13:59')).toBeTrue();
    });

    it('should return true for time at start of interval', () => {
      const interval = new Interval('09:00', '14:00');

      expect(interval.contains('09:00')).toBeTrue();
    });

    it('should return false for time at end of interval (exclusive)', () => {
      const interval = new Interval('09:00', '14:00');

      expect(interval.contains('14:00')).toBeFalse();
    });

    it('should return false for time before interval', () => {
      const interval = new Interval('09:00', '14:00');

      expect(interval.contains('08:00')).toBeFalse();
      expect(interval.contains('08:59')).toBeFalse();
    });

    it('should return false for time after interval', () => {
      const interval = new Interval('09:00', '14:00');

      expect(interval.contains('14:01')).toBeFalse();
      expect(interval.contains('18:00')).toBeFalse();
    });
  });

  describe('overlaps()', () => {
    it('should detect overlapping intervals', () => {
      const interval1 = new Interval('09:00', '14:00');
      const interval2 = new Interval('12:00', '18:00');

      expect(interval1.overlaps(interval2)).toBeTrue();
      expect(interval2.overlaps(interval1)).toBeTrue();
    });

    it('should return false for non-overlapping intervals', () => {
      const interval1 = new Interval('09:00', '12:00');
      const interval2 = new Interval('14:00', '18:00');

      expect(interval1.overlaps(interval2)).toBeFalse();
      expect(interval2.overlaps(interval1)).toBeFalse();
    });

    it('should return false for adjacent intervals (no overlap)', () => {
      const interval1 = new Interval('09:00', '12:00');
      const interval2 = new Interval('12:00', '14:00');

      expect(interval1.overlaps(interval2)).toBeFalse();
    });

    it('should detect contained intervals', () => {
      const outer = new Interval('09:00', '18:00');
      const inner = new Interval('11:00', '15:00');

      expect(outer.overlaps(inner)).toBeTrue();
      expect(inner.overlaps(outer)).toBeTrue();
    });

    it('should detect partial overlap at start', () => {
      const interval1 = new Interval('09:00', '12:00');
      const interval2 = new Interval('08:00', '10:00');

      expect(interval1.overlaps(interval2)).toBeTrue();
    });

    it('should detect partial overlap at end', () => {
      const interval1 = new Interval('09:00', '12:00');
      const interval2 = new Interval('11:00', '14:00');

      expect(interval1.overlaps(interval2)).toBeTrue();
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight correctly', () => {
      const interval = new Interval('00:00', '06:00');

      expect(interval.contains('00:00')).toBeTrue();
      expect(interval.contains('03:00')).toBeTrue();
      expect(interval.getDurationInMinutes()).toBe(360);
    });

    it('should handle end of day', () => {
      const interval = new Interval('20:00', '23:59');

      expect(interval.contains('22:00')).toBeTrue();
      expect(interval.getDurationInMinutes()).toBe(239);
    });

    it('should handle 30-minute intervals', () => {
      const interval = new Interval('10:30', '11:00');

      expect(interval.getDurationInMinutes()).toBe(30);
      expect(interval.contains('10:30')).toBeTrue();
      expect(interval.contains('10:45')).toBeTrue();
      expect(interval.contains('11:00')).toBeFalse();
    });
  });
});
