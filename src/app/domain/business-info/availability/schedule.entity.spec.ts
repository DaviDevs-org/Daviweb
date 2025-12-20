import { ScheduleDay } from './schedule.entity';
import { Interval } from './interval.entity';

describe('ScheduleDay Entity', () => {
  describe('Constructor', () => {
    it('should create a valid schedule day', () => {
      const intervals = [new Interval('09:00', '14:00'), new Interval('16:00', '20:00')];
      const scheduleDay = new ScheduleDay('lunes', 'Lunes', false, intervals);

      expect(scheduleDay.day).toBe('lunes');
      expect(scheduleDay.name).toBe('Lunes');
      expect(scheduleDay.closed).toBeFalse();
      expect(scheduleDay.intervals.length).toBe(2);
    });

    it('should create a closed day', () => {
      const scheduleDay = new ScheduleDay('domingo', 'Domingo', true, []);

      expect(scheduleDay.closed).toBeTrue();
      expect(scheduleDay.intervals).toEqual([]);
    });

    it('should throw error for overlapping intervals', () => {
      const overlappingIntervals = [
        new Interval('09:00', '14:00'),
        new Interval('13:00', '18:00'), // Overlaps with first
      ];

      expect(
        () => new ScheduleDay('lunes', 'Lunes', false, overlappingIntervals)
      ).toThrowError(/Solapamiento detectado/);
    });

    it('should accept adjacent intervals without overlap', () => {
      const adjacentIntervals = [
        new Interval('09:00', '14:00'),
        new Interval('14:00', '20:00'), // Starts exactly when first ends
      ];

      expect(
        () => new ScheduleDay('lunes', 'Lunes', false, adjacentIntervals)
      ).not.toThrow();
    });

    it('should not validate intervals when closed', () => {
      // Even with "invalid" overlapping intervals, closed days don't validate
      const intervals = [
        new Interval('09:00', '14:00'),
        new Interval('10:00', '12:00'),
      ];

      // This should NOT throw because closed=true skips validation
      expect(
        () => new ScheduleDay('domingo', 'Domingo', true, intervals)
      ).not.toThrow();
    });

    it('should accept single interval', () => {
      const scheduleDay = new ScheduleDay('sábado', 'Sábado', false, [
        new Interval('09:00', '14:00'),
      ]);

      expect(scheduleDay.intervals.length).toBe(1);
    });
  });

  describe('isOpen()', () => {
    it('should return true for open day with intervals', () => {
      const scheduleDay = new ScheduleDay('lunes', 'Lunes', false, [
        new Interval('09:00', '14:00'),
      ]);

      expect(scheduleDay.isOpen()).toBeTrue();
    });

    it('should return false for closed day', () => {
      const scheduleDay = new ScheduleDay('domingo', 'Domingo', true, []);

      expect(scheduleDay.isOpen()).toBeFalse();
    });

    it('should return false for day with no intervals', () => {
      const scheduleDay = new ScheduleDay('lunes', 'Lunes', false, []);

      expect(scheduleDay.isOpen()).toBeFalse();
    });
  });

  describe('isTimeWithinDay()', () => {
    let scheduleDay: ScheduleDay;

    beforeEach(() => {
      scheduleDay = new ScheduleDay('lunes', 'Lunes', false, [
        new Interval('09:00', '14:00'),
        new Interval('16:00', '20:00'),
      ]);
    });

    it('should return true for time within first interval', () => {
      expect(scheduleDay.isTimeWithinDay('10:00')).toBeTrue();
      expect(scheduleDay.isTimeWithinDay('09:00')).toBeTrue();
      expect(scheduleDay.isTimeWithinDay('13:59')).toBeTrue();
    });

    it('should return true for time within second interval', () => {
      expect(scheduleDay.isTimeWithinDay('17:00')).toBeTrue();
      expect(scheduleDay.isTimeWithinDay('16:00')).toBeTrue();
      expect(scheduleDay.isTimeWithinDay('19:59')).toBeTrue();
    });

    it('should return false for time between intervals (break time)', () => {
      expect(scheduleDay.isTimeWithinDay('14:30')).toBeFalse();
      expect(scheduleDay.isTimeWithinDay('15:00')).toBeFalse();
    });

    it('should return false for time before opening', () => {
      expect(scheduleDay.isTimeWithinDay('08:00')).toBeFalse();
      expect(scheduleDay.isTimeWithinDay('08:59')).toBeFalse();
    });

    it('should return false for time after closing', () => {
      expect(scheduleDay.isTimeWithinDay('20:01')).toBeFalse();
      expect(scheduleDay.isTimeWithinDay('22:00')).toBeFalse();
    });

    it('should return false at closing time (exclusive)', () => {
      expect(scheduleDay.isTimeWithinDay('14:00')).toBeFalse();
      expect(scheduleDay.isTimeWithinDay('20:00')).toBeFalse();
    });

    it('should return false for closed day', () => {
      const closedDay = new ScheduleDay('domingo', 'Domingo', true, []);

      expect(closedDay.isTimeWithinDay('12:00')).toBeFalse();
    });
  });

  describe('getTotalRange()', () => {
    it('should return range from earliest open to latest close', () => {
      const scheduleDay = new ScheduleDay('lunes', 'Lunes', false, [
        new Interval('09:00', '14:00'),
        new Interval('16:00', '20:00'),
      ]);

      const range = scheduleDay.getTotalRange();

      expect(range).toEqual({ open: '09:00', close: '20:00' });
    });

    it('should return single interval range', () => {
      const scheduleDay = new ScheduleDay('sábado', 'Sábado', false, [
        new Interval('09:00', '14:00'),
      ]);

      const range = scheduleDay.getTotalRange();

      expect(range).toEqual({ open: '09:00', close: '14:00' });
    });

    it('should return null for closed day', () => {
      const closedDay = new ScheduleDay('domingo', 'Domingo', true, []);

      expect(closedDay.getTotalRange()).toBeNull();
    });

    it('should return null for day with no intervals', () => {
      const emptyDay = new ScheduleDay('festivo', 'Festivo', false, []);

      expect(emptyDay.getTotalRange()).toBeNull();
    });

    it('should handle unordered intervals', () => {
      const scheduleDay = new ScheduleDay('lunes', 'Lunes', false, [
        new Interval('16:00', '20:00'), // Second interval first
        new Interval('09:00', '14:00'), // First interval second
      ]);

      const range = scheduleDay.getTotalRange();

      expect(range).toEqual({ open: '09:00', close: '20:00' });
    });
  });

  describe('Interval Validation Edge Cases', () => {
    it('should accept three non-overlapping intervals', () => {
      const intervals = [
        new Interval('08:00', '11:00'),
        new Interval('12:00', '15:00'),
        new Interval('17:00', '21:00'),
      ];

      expect(
        () => new ScheduleDay('especial', 'Especial', false, intervals)
      ).not.toThrow();
    });

    it('should detect overlap in the middle of multiple intervals', () => {
      const intervals = [
        new Interval('08:00', '11:00'),
        new Interval('10:00', '15:00'), // Overlaps with first
        new Interval('17:00', '21:00'),
      ];

      expect(
        () => new ScheduleDay('especial', 'Especial', false, intervals)
      ).toThrowError(/Solapamiento detectado/);
    });
  });
});
