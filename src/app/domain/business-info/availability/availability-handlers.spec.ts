import {
  AvailabilityHandler,
  AvailabilityContext,
  DayAvailability,
  PastDateHandler,
  ExceptionHandler,
  WeeklyScheduleHandler,
} from './availability-handlers';
import { ScheduleDay } from './schedule.entity';
import { ExceptionItem } from './exception.entity';
import { Interval } from './interval.entity';

describe('Availability Handlers (Chain of Responsibility)', () => {
  // Test fixtures
  const createSchedule = (): ScheduleDay[] => [
    new ScheduleDay('lunes', 'Lunes', false, [new Interval('09:00', '14:00'), new Interval('16:00', '20:00')]),
    new ScheduleDay('martes', 'Martes', false, [new Interval('09:00', '14:00'), new Interval('16:00', '20:00')]),
    new ScheduleDay('miércoles', 'Miércoles', false, [new Interval('09:00', '14:00'), new Interval('16:00', '20:00')]),
    new ScheduleDay('jueves', 'Jueves', false, [new Interval('09:00', '14:00'), new Interval('16:00', '20:00')]),
    new ScheduleDay('viernes', 'Viernes', false, [new Interval('09:00', '14:00'), new Interval('16:00', '20:00')]),
    new ScheduleDay('sábado', 'Sábado', false, [new Interval('09:00', '14:00')]),
    new ScheduleDay('domingo', 'Domingo', true, []), // Closed
  ];

  describe('PastDateHandler', () => {
    let handler: PastDateHandler;

    beforeEach(() => {
      handler = new PastDateHandler();
    });

    it('should reject past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 7 days ago

      const context: AvailabilityContext = {
        date: pastDate,
        schedule: createSchedule(),
        exceptions: [],
      };

      const result = handler.handle(context);

      expect(result.isAvailable).toBeFalse();
      expect(result.reason).toBe('Past date');
      expect(result.intervals).toEqual([]);
    });

    it('should pass today to next handler', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0); // Ensure it's today

      const context: AvailabilityContext = {
        date: today,
        schedule: createSchedule(),
        exceptions: [],
      };

      // Without next handler, should return "End of chain"
      const result = handler.handle(context);

      expect(result.isAvailable).toBeFalse();
      expect(result.reason).toBe('End of chain');
    });

    it('should pass future dates to next handler', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      const context: AvailabilityContext = {
        date: futureDate,
        schedule: createSchedule(),
        exceptions: [],
      };

      const result = handler.handle(context);

      expect(result.reason).toBe('End of chain');
    });

    it('should chain to next handler correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockNextHandler = jasmine.createSpyObj<AvailabilityHandler>('NextHandler', ['handle', 'setNext']);
      mockNextHandler.handle.and.returnValue({
        isAvailable: true,
        intervals: [new Interval('09:00', '14:00')],
      });

      handler.setNext(mockNextHandler as any);

      const context: AvailabilityContext = {
        date: futureDate,
        schedule: createSchedule(),
        exceptions: [],
      };

      const result = handler.handle(context);

      expect(mockNextHandler.handle).toHaveBeenCalledWith(context);
      expect(result.isAvailable).toBeTrue();
    });
  });

  describe('ExceptionHandler', () => {
    let handler: ExceptionHandler;

    beforeEach(() => {
      handler = new ExceptionHandler();
    });

    it('should return unavailable for closed exception', () => {
      const exceptionDate = new Date('2025-12-25');
      const exception = new ExceptionItem(
        '2025-12-25',
        true, // closed
        [],
        'closed'
      );

      const context: AvailabilityContext = {
        date: exceptionDate,
        schedule: createSchedule(),
        exceptions: [exception],
      };

      const result = handler.handle(context);

      expect(result.isAvailable).toBeFalse();
      expect(result.reason).toBe('Exception: Closed');
    });

    it('should return custom intervals for custom exception', () => {
      const exceptionDate = new Date('2025-12-24');
      const customIntervals = [new Interval('10:00', '13:00')];
      const exception = new ExceptionItem(
        '2025-12-24',
        false,
        customIntervals,
        'custom'
      );

      const context: AvailabilityContext = {
        date: exceptionDate,
        schedule: createSchedule(),
        exceptions: [exception],
      };

      const result = handler.handle(context);

      expect(result.isAvailable).toBeTrue();
      expect(result.intervals).toEqual(customIntervals);
    });

    it('should pass to next handler when no exception exists', () => {
      const normalDate = new Date('2025-06-15');

      const context: AvailabilityContext = {
        date: normalDate,
        schedule: createSchedule(),
        exceptions: [],
      };

      const result = handler.handle(context);

      expect(result.reason).toBe('End of chain');
    });

    it('should handle range exceptions correctly', () => {
      // Range exception from Dec 20 to Dec 31
      const rangeException = new ExceptionItem(
        '2025-12-20', // base date (can be any within range for identification)
        true,
        [],
        'range',
        undefined,
        undefined,
        '2025-12-20',
        '2025-12-31'
      );

      const dateInRange = new Date('2025-12-25');

      const context: AvailabilityContext = {
        date: dateInRange,
        schedule: createSchedule(),
        exceptions: [rangeException],
      };

      const result = handler.handle(context);

      expect(result.isAvailable).toBeFalse();
      expect(result.reason).toBe('Exception: Closed');
    });
  });

  describe('WeeklyScheduleHandler', () => {
    let handler: WeeklyScheduleHandler;

    beforeEach(() => {
      handler = new WeeklyScheduleHandler();
    });

    it('should return schedule intervals for open day', () => {
      // Monday
      const monday = new Date('2025-01-20'); // A Monday
      const schedule = createSchedule();

      const context: AvailabilityContext = {
        date: monday,
        schedule,
        exceptions: [],
      };

      const result = handler.handle(context);

      expect(result.isAvailable).toBeTrue();
      expect(result.intervals.length).toBe(2);
      expect(result.intervals[0].open).toBe('09:00');
      expect(result.intervals[0].close).toBe('14:00');
      expect(result.intervals[1].open).toBe('16:00');
      expect(result.intervals[1].close).toBe('20:00');
    });

    it('should return unavailable for closed day (Sunday)', () => {
      const sunday = new Date('2025-01-19'); // A Sunday
      const schedule = createSchedule();

      const context: AvailabilityContext = {
        date: sunday,
        schedule,
        exceptions: [],
      };

      const result = handler.handle(context);

      expect(result.isAvailable).toBeFalse();
      expect(result.reason).toBe('Weekly schedule: Closed');
    });

    it('should return Saturday schedule (single interval)', () => {
      const saturday = new Date('2025-01-18'); // A Saturday
      const schedule = createSchedule();

      const context: AvailabilityContext = {
        date: saturday,
        schedule,
        exceptions: [],
      };

      const result = handler.handle(context);

      expect(result.isAvailable).toBeTrue();
      expect(result.intervals.length).toBe(1);
      expect(result.intervals[0].open).toBe('09:00');
      expect(result.intervals[0].close).toBe('14:00');
    });

    it('should return unavailable when no schedule found', () => {
      const date = new Date('2025-01-20');

      const context: AvailabilityContext = {
        date,
        schedule: [], // Empty schedule
        exceptions: [],
      };

      const result = handler.handle(context);

      expect(result.isAvailable).toBeFalse();
      expect(result.reason).toBe('No schedule found');
    });
  });

  describe('Full Chain Integration', () => {
    let pastDateHandler: PastDateHandler;
    let exceptionHandler: ExceptionHandler;
    let weeklyScheduleHandler: WeeklyScheduleHandler;

    beforeEach(() => {
      pastDateHandler = new PastDateHandler();
      exceptionHandler = new ExceptionHandler();
      weeklyScheduleHandler = new WeeklyScheduleHandler();

      // Build chain: PastDate -> Exception -> WeeklySchedule
      pastDateHandler.setNext(exceptionHandler).setNext(weeklyScheduleHandler);
    });

    it('should reject past dates through full chain', () => {
      const pastDate = new Date('2020-01-01');

      const context: AvailabilityContext = {
        date: pastDate,
        schedule: createSchedule(),
        exceptions: [],
      };

      const result = pastDateHandler.handle(context);

      expect(result.isAvailable).toBeFalse();
      expect(result.reason).toBe('Past date');
    });

    it('should apply exception when present', () => {
      const holidayDate = new Date('2025-12-25');
      const exception = new ExceptionItem('2025-12-25', true, [], 'closed');

      const context: AvailabilityContext = {
        date: holidayDate,
        schedule: createSchedule(),
        exceptions: [exception],
      };

      const result = pastDateHandler.handle(context);

      expect(result.isAvailable).toBeFalse();
      expect(result.reason).toBe('Exception: Closed');
    });

    it('should fall through to weekly schedule when no exception', () => {
      // A future Monday with no exceptions
      const futureMonday = new Date();
      futureMonday.setDate(futureMonday.getDate() + 7);
      // Find next Monday
      while (futureMonday.getDay() !== 1) {
        futureMonday.setDate(futureMonday.getDate() + 1);
      }

      const context: AvailabilityContext = {
        date: futureMonday,
        schedule: createSchedule(),
        exceptions: [],
      };

      const result = pastDateHandler.handle(context);

      expect(result.isAvailable).toBeTrue();
      expect(result.intervals.length).toBe(2);
    });

    it('should handle custom exception with special hours', () => {
      const specialDay = new Date('2025-06-15');
      // Usar el mismo formato que ExceptionHandler.formatDate()
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const specialDayStr = formatDate(specialDay);
      const specialIntervals = [new Interval('11:00', '15:00')];
      const exception = new ExceptionItem(
        specialDayStr,
        false,
        specialIntervals,
        'custom'
      );

      const context: AvailabilityContext = {
        date: specialDay,
        schedule: createSchedule(),
        exceptions: [exception],
      };

      const result = pastDateHandler.handle(context);

      expect(result.isAvailable).toBeTrue();
      expect(result.intervals).toEqual(specialIntervals);
    });
  });

  describe('setNext() Fluent Interface', () => {
    it('should return the next handler for chaining', () => {
      const handler1 = new PastDateHandler();
      const handler2 = new ExceptionHandler();
      const handler3 = new WeeklyScheduleHandler();

      const returnedHandler = handler1.setNext(handler2);

      expect(returnedHandler).toBe(handler2);

      // Should allow chaining
      handler1.setNext(handler2).setNext(handler3);
    });
  });
});
