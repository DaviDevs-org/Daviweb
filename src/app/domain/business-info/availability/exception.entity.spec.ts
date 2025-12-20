import { ExceptionItem } from './exception.entity';
import { Interval } from './interval.entity';

describe('ExceptionItem Entity', () => {
  describe('Constructor', () => {
    it('should create a closed exception', () => {
      const exception = new ExceptionItem(
        '2025-12-25',
        true,
        [],
        'closed'
      );

      expect(exception.date).toBe('2025-12-25');
      expect(exception.closed).toBeTrue();
      expect(exception.exceptionType).toBe('closed');
      expect(exception.intervals).toEqual([]);
    });

    it('should create a custom exception with special hours', () => {
      const customIntervals = [new Interval('10:00', '14:00')];
      const exception = new ExceptionItem(
        '2025-12-24',
        false,
        customIntervals,
        'custom'
      );

      expect(exception.closed).toBeFalse();
      expect(exception.exceptionType).toBe('custom');
      expect(exception.intervals).toEqual(customIntervals);
    });

    it('should create a range exception', () => {
      const exception = new ExceptionItem(
        '2025-08-01',
        true,
        [],
        'range',
        undefined,
        undefined,
        '2025-08-01',
        '2025-08-15'
      );

      expect(exception.exceptionType).toBe('range');
      expect(exception.startDate).toBe('2025-08-01');
      expect(exception.endDate).toBe('2025-08-15');
    });

    it('should throw error for range exception without startDate', () => {
      expect(() => new ExceptionItem(
        '2025-08-01',
        true,
        [],
        'range',
        undefined,
        undefined,
        undefined, // Missing startDate
        '2025-08-15'
      )).toThrowError(/requieren startDate y endDate/);
    });

    it('should throw error for range exception without endDate', () => {
      expect(() => new ExceptionItem(
        '2025-08-01',
        true,
        [],
        'range',
        undefined,
        undefined,
        '2025-08-01',
        undefined // Missing endDate
      )).toThrowError(/requieren startDate y endDate/);
    });

    it('should throw error when startDate is after endDate', () => {
      expect(() => new ExceptionItem(
        '2025-08-15',
        true,
        [],
        'range',
        undefined,
        undefined,
        '2025-08-15', // Start
        '2025-08-01'  // End is before start
      )).toThrowError(/no puede ser posterior/);
    });

    it('should throw error for overlapping intervals in custom exception', () => {
      const overlappingIntervals = [
        new Interval('09:00', '14:00'),
        new Interval('12:00', '16:00'), // Overlaps
      ];

      expect(() => new ExceptionItem(
        '2025-12-24',
        false,
        overlappingIntervals,
        'custom'
      )).toThrowError(/Solapamiento de horarios/);
    });

    it('should accept multiple non-overlapping intervals', () => {
      const validIntervals = [
        new Interval('09:00', '12:00'),
        new Interval('14:00', '18:00'),
      ];

      expect(() => new ExceptionItem(
        '2025-12-24',
        false,
        validIntervals,
        'custom'
      )).not.toThrow();
    });

    it('should not validate intervals for closed exceptions', () => {
      // Even with overlapping intervals, closed exceptions skip validation
      const intervals = [
        new Interval('09:00', '14:00'),
        new Interval('12:00', '16:00'),
      ];

      expect(() => new ExceptionItem(
        '2025-12-25',
        true, // Closed
        intervals,
        'closed'
      )).not.toThrow();
    });
  });

  describe('isActiveOnDate()', () => {
    describe('Single date exception', () => {
      it('should return true for matching date', () => {
        const exception = new ExceptionItem('2025-12-25', true, [], 'closed');

        expect(exception.isActiveOnDate('2025-12-25')).toBeTrue();
      });

      it('should return false for non-matching date', () => {
        const exception = new ExceptionItem('2025-12-25', true, [], 'closed');

        expect(exception.isActiveOnDate('2025-12-26')).toBeFalse();
        expect(exception.isActiveOnDate('2025-12-24')).toBeFalse();
      });
    });

    describe('Range exception', () => {
      let rangeException: ExceptionItem;

      beforeEach(() => {
        rangeException = new ExceptionItem(
          '2025-08-01',
          true,
          [],
          'range',
          undefined,
          undefined,
          '2025-08-01',
          '2025-08-15'
        );
      });

      it('should return true for date at start of range', () => {
        expect(rangeException.isActiveOnDate('2025-08-01')).toBeTrue();
      });

      it('should return true for date at end of range', () => {
        expect(rangeException.isActiveOnDate('2025-08-15')).toBeTrue();
      });

      it('should return true for date within range', () => {
        expect(rangeException.isActiveOnDate('2025-08-10')).toBeTrue();
        expect(rangeException.isActiveOnDate('2025-08-07')).toBeTrue();
      });

      it('should return false for date before range', () => {
        expect(rangeException.isActiveOnDate('2025-07-31')).toBeFalse();
      });

      it('should return false for date after range', () => {
        expect(rangeException.isActiveOnDate('2025-08-16')).toBeFalse();
      });
    });
  });

  describe('isTimeWithinException()', () => {
    it('should return false for closed exception', () => {
      const closedException = new ExceptionItem('2025-12-25', true, [], 'closed');

      expect(closedException.isTimeWithinException('10:00')).toBeFalse();
      expect(closedException.isTimeWithinException('14:00')).toBeFalse();
    });

    it('should return true for time within custom exception intervals', () => {
      const customException = new ExceptionItem(
        '2025-12-24',
        false,
        [new Interval('10:00', '14:00')],
        'custom'
      );

      expect(customException.isTimeWithinException('10:00')).toBeTrue();
      expect(customException.isTimeWithinException('12:00')).toBeTrue();
      expect(customException.isTimeWithinException('13:59')).toBeTrue();
    });

    it('should return false for time outside custom exception intervals', () => {
      const customException = new ExceptionItem(
        '2025-12-24',
        false,
        [new Interval('10:00', '14:00')],
        'custom'
      );

      expect(customException.isTimeWithinException('09:00')).toBeFalse();
      expect(customException.isTimeWithinException('14:00')).toBeFalse();
      expect(customException.isTimeWithinException('15:00')).toBeFalse();
    });

    it('should check multiple intervals', () => {
      const customException = new ExceptionItem(
        '2025-12-24',
        false,
        [
          new Interval('09:00', '12:00'),
          new Interval('16:00', '20:00'),
        ],
        'custom'
      );

      expect(customException.isTimeWithinException('10:00')).toBeTrue();
      expect(customException.isTimeWithinException('18:00')).toBeTrue();
      expect(customException.isTimeWithinException('14:00')).toBeFalse();
    });
  });

  describe('getTotalRange()', () => {
    it('should return null for closed exception', () => {
      const closedException = new ExceptionItem('2025-12-25', true, [], 'closed');

      expect(closedException.getTotalRange()).toBeNull();
    });

    it('should return range for custom exception with single interval', () => {
      const customException = new ExceptionItem(
        '2025-12-24',
        false,
        [new Interval('10:00', '14:00')],
        'custom'
      );

      expect(customException.getTotalRange()).toEqual({
        open: '10:00',
        close: '14:00',
      });
    });

    it('should return full range for multiple intervals', () => {
      const customException = new ExceptionItem(
        '2025-12-24',
        false,
        [
          new Interval('09:00', '12:00'),
          new Interval('16:00', '20:00'),
        ],
        'custom'
      );

      expect(customException.getTotalRange()).toEqual({
        open: '09:00',
        close: '20:00',
      });
    });

    it('should return null for exception with no intervals', () => {
      const exception = new ExceptionItem('2025-12-24', false, [], 'custom');

      expect(exception.getTotalRange()).toBeNull();
    });
  });

  describe('isEditing flag', () => {
    it('should track editing state', () => {
      const exception = new ExceptionItem(
        '2025-12-25',
        true,
        [],
        'closed',
        'exc-123',
        true // isEditing
      );

      expect(exception.isEditing).toBeTrue();
    });

    it('should default to undefined when not provided', () => {
      const exception = new ExceptionItem('2025-12-25', true, [], 'closed');

      expect(exception.isEditing).toBeUndefined();
    });
  });

  describe('ID handling', () => {
    it('should store optional ID', () => {
      const exception = new ExceptionItem(
        '2025-12-25',
        true,
        [],
        'closed',
        'exc-456'
      );

      expect(exception.id).toBe('exc-456');
    });

    it('should handle undefined ID', () => {
      const exception = new ExceptionItem('2025-12-25', true, [], 'closed');

      expect(exception.id).toBeUndefined();
    });
  });
});
