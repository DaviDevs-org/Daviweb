import { TestBed } from '@angular/core/testing';
import { GetAvailableSlotsForDayService } from './get-available-slots-for-day.service';
import { ScheduleDay } from './schedule.entity';
import { ExceptionItem } from './exception.entity';
import { ReservedSlot } from './reservedSlots.entity';
import { Interval } from './interval.entity';


describe('GetAvailableSlotsForDayService', () => {
  let service: GetAvailableSlotsForDayService;


  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GetAvailableSlotsForDayService],
    });
    service = TestBed.inject(GetAvailableSlotsForDayService);
  });


  // Test fixtures
  const createSchedule = (): ScheduleDay[] => [
    new ScheduleDay('lunes', 'Lunes', false, [
      new Interval('09:00', '14:00'),
      new Interval('16:00', '20:00'),
    ]),
    new ScheduleDay('martes', 'Martes', false, [
      new Interval('09:00', '14:00'),
      new Interval('16:00', '20:00'),
    ]),
    new ScheduleDay('miércoles', 'Miércoles', false, [
      new Interval('09:00', '14:00'),
      new Interval('16:00', '20:00'),
    ]),
    new ScheduleDay('jueves', 'Jueves', false, [
      new Interval('09:00', '14:00'),
      new Interval('16:00', '20:00'),
    ]),
    new ScheduleDay('viernes', 'Viernes', false, [
      new Interval('09:00', '14:00'),
      new Interval('16:00', '20:00'),
    ]),
    new ScheduleDay('sábado', 'Sábado', false, [new Interval('09:00', '14:00')]),
    new ScheduleDay('domingo', 'Domingo', true, []),
  ];


  describe('Basic Slot Generation', () => {
    it('should generate slots for a regular weekday', () => {
      // Find a future Monday
      const monday = new Date();
      while (monday.getDay() !== 1) {
        monday.setDate(monday.getDate() + 1);
      }
      monday.setHours(12, 0, 0, 0);


      const slots = service.execute(monday, createSchedule(), [], []);


      // Morning: 09:00-14:00 = 10 slots (09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30, 13:00, 13:30)
      // Afternoon: 16:00-20:00 = 8 slots (16:00, 16:30, 17:00, 17:30, 18:00, 18:30, 19:00, 19:30)
      // Total = 18 slots
      expect(slots.length).toBe(18);
      expect(slots).toContain('09:00');
      expect(slots).toContain('13:30');
      expect(slots).toContain('16:00');
      expect(slots).toContain('19:30');
    });


    it('should generate slots for Saturday (single interval)', () => {
      // Find a future Saturday
      const saturday = new Date();
      while (saturday.getDay() !== 6) {
        saturday.setDate(saturday.getDate() + 1);
      }
      saturday.setHours(12, 0, 0, 0);


      const slots = service.execute(saturday, createSchedule(), [], []);


      // Morning only: 09:00-14:00 = 10 slots
      expect(slots.length).toBe(10);
      expect(slots).toContain('09:00');
      expect(slots).toContain('13:30');
      expect(slots).not.toContain('14:00');
      expect(slots).not.toContain('16:00');
    });


    it('should return empty array for closed day (Sunday)', () => {
      // Find a future Sunday
      const sunday = new Date();
      while (sunday.getDay() !== 0) {
        sunday.setDate(sunday.getDate() + 1);
      }
      sunday.setHours(12, 0, 0, 0);


      const slots = service.execute(sunday, createSchedule(), [], []);


      expect(slots).toEqual([]);
    });


    it('should return empty array for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);


      const slots = service.execute(pastDate, createSchedule(), [], []);


      expect(slots).toEqual([]);
    });
  });


  describe('Reserved Slots Filtering', () => {
    it('should exclude reserved slots', () => {
      // Find a future Monday
      const monday = new Date();
      while (monday.getDay() !== 1) {
        monday.setDate(monday.getDate() + 1);
      }
      monday.setHours(12, 0, 0, 0);


      // Reserve some slots
      const reserved = [
        new ReservedSlot(
          'apt-1',
          new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate(),
            10,
            0,
            0
          )
        ),
        new ReservedSlot(
          'apt-2',
          new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate(),
            10,
            30,
            0
          )
        ),
      ];


      const slots = service.execute(monday, createSchedule(), [], reserved);


      expect(slots).not.toContain('10:00');
      expect(slots).not.toContain('10:30');
      expect(slots).toContain('09:00');
      expect(slots).toContain('11:00');
    });


    it('should not be affected by reservations on different dates', () => {
      // Find a future Monday
      const monday = new Date();
      while (monday.getDay() !== 1) {
        monday.setDate(monday.getDate() + 1);
      }
      monday.setHours(12, 0, 0, 0);


      // Reserve slot on a different day
      const otherDay = new Date(monday);
      otherDay.setDate(otherDay.getDate() + 1);
      otherDay.setHours(10, 0, 0, 0);


      const reserved = [new ReservedSlot('apt-1', otherDay)];


      const slots = service.execute(monday, createSchedule(), [], reserved);


      // All 18 slots should be available
      expect(slots.length).toBe(18);
    });


    it('should handle multiple reservations for same appointment', () => {
      const monday = new Date();
      while (monday.getDay() !== 1) {
        monday.setDate(monday.getDate() + 1);
      }
      monday.setHours(12, 0, 0, 0);


      // 1.5 hour service takes 3 slots
      const reserved = [
        new ReservedSlot(
          'apt-1',
          new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate(),
            10,
            0,
            0
          )
        ),
        new ReservedSlot(
          'apt-1',
          new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate(),
            10,
            30,
            0
          )
        ),
        new ReservedSlot(
          'apt-1',
          new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate(),
            11,
            0,
            0
          )
        ),
      ];


      const slots = service.execute(monday, createSchedule(), [], reserved);


      expect(slots).not.toContain('10:00');
      expect(slots).not.toContain('10:30');
      expect(slots).not.toContain('11:00');
      expect(slots).toContain('09:00');
      expect(slots).toContain('11:30');
    });
  });


  describe('Exceptions Handling', () => {
    it('should return empty array for closed exception', () => {
      // Use December 25, 2025 (Thursday) - a weekday
      const holidayDate = new Date(2025, 11, 25, 12, 0, 0);
      const exception = new ExceptionItem('2025-12-25', true, [], 'closed');


      const slots = service.execute(
        holidayDate,
        createSchedule(),
        [exception],
        []
      );


      expect(slots).toEqual([]);
    });


    it('should combine exception with reserved slots - FINAL DEBUG', () => {
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // CHANGE TO 2026!
  const specialDay = new Date(2026, 5, 16, 12, 0, 0); // June 16, 2026 (future date)
  const specialDayStr = formatDate(specialDay);
  
  const exception = new ExceptionItem(
    specialDayStr,
    false,
    [new Interval('10:00', '14:00')],
    'custom'
  );

  const reserved = [
    new ReservedSlot('apt-1', new Date(2026, 5, 16, 11, 0, 0)),
    new ReservedSlot('apt-1', new Date(2026, 5, 16, 11, 30, 0)),
  ];

  const slots = service.execute(
    specialDay,
    createSchedule(),
    [exception],
    reserved
  );
  
  expect(slots.length).toBe(6);
  expect(slots).not.toContain('11:00');
  expect(slots).not.toContain('11:30');
});


    it('should handle range exception (vacation period)', () => {
      // Use August 11, 2025 (Monday) instead of August 10 (Sunday)
      const dateInRange = new Date(2025, 7, 11, 12, 0, 0);
      const rangeException = new ExceptionItem(
        '2025-08-01',
        true,
        [],
        'range',
        undefined,
        undefined,
        '2025-08-01',
        '2025-08-15'
      );


      const slots = service.execute(
        dateInRange,
        createSchedule(),
        [rangeException],
        []
      );


      expect(slots).toEqual([]);
    });
  });


  describe('Edge Cases', () => {
    it('should handle empty schedule', () => {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      date.setHours(12, 0, 0, 0);


      const slots = service.execute(date, [], [], []);


      expect(slots).toEqual([]);
    });


    it('should handle today correctly (not past)', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);


      // Only test if today is not Sunday
      if (today.getDay() !== 0) {
        const slots = service.execute(today, createSchedule(), [], []);


        // Should have slots (afternoon at least if it's before 16:00)
        expect(slots.length).toBeGreaterThan(0);
      }
    });


    it('should normalize time strings consistently', () => {
      const monday = new Date();
      while (monday.getDay() !== 1) {
        monday.setDate(monday.getDate() + 1);
      }
      monday.setHours(12, 0, 0, 0);


      // Reserved slot with potential formatting issue
      const reserved = [
        new ReservedSlot(
          'apt-1',
          new Date(
            monday.getFullYear(),
            monday.getMonth(),
            monday.getDate(),
            9,
            0,
            0
          )
        ),
      ];


      const slots = service.execute(monday, createSchedule(), [], reserved);


      // Should properly filter out '09:00' regardless of padding
      expect(slots).not.toContain('09:00');
      expect(slots).not.toContain('9:00');
    });


    it('should generate slots at 30-minute intervals only', () => {
      const monday = new Date();
      while (monday.getDay() !== 1) {
        monday.setDate(monday.getDate() + 1);
      }
      monday.setHours(12, 0, 0, 0);


      const slots = service.execute(monday, createSchedule(), [], []);


      slots.forEach((slot) => {
        const [, minutes] = slot.split(':').map(Number);
        expect(minutes === 0 || minutes === 30).toBeTrue();
      });
    });
  });


  describe('Slot Order', () => {
    it('should return slots in chronological order', () => {
      const monday = new Date();
      while (monday.getDay() !== 1) {
        monday.setDate(monday.getDate() + 1);
      }
      monday.setHours(12, 0, 0, 0);


      const slots = service.execute(monday, createSchedule(), [], []);


      // First slot should be 09:00
      expect(slots[0]).toBe('09:00');


      // Verify order
      for (let i = 1; i < slots.length; i++) {
        const [prevH, prevM] = slots[i - 1].split(':').map(Number);
        const [currH, currM] = slots[i].split(':').map(Number);
        const prevMinutes = prevH * 60 + prevM;
        const currMinutes = currH * 60 + currM;


        expect(currMinutes).toBeGreaterThan(prevMinutes);
      }
    });
  });


  describe('Integration with Full Chain', () => {
    it('should process complete availability flow', () => {
      // Setup: Find a weekday 2 weeks from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 14);
      while (futureDate.getDay() === 0 || futureDate.getDay() === 6) {
        futureDate.setDate(futureDate.getDate() + 1);
      }
      futureDate.setHours(12, 0, 0, 0);


      const schedule = createSchedule();
      const exceptions: ExceptionItem[] = [];


      // Reserve first morning slot
      const reserved = [
        new ReservedSlot(
          'apt-1',
          new Date(
            futureDate.getFullYear(),
            futureDate.getMonth(),
            futureDate.getDate(),
            9,
            0,
            0
          )
        ),
      ];


      const slots = service.execute(futureDate, schedule, exceptions, reserved);


      // Verify integration
      expect(slots.length).toBe(17); // 18 - 1 reserved
      expect(slots[0]).toBe('09:30'); // First available after reserved
    });
  });

});
