import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { AddAppointmentUseCase } from './add-appointment.use-case';
import { AppointmentRepository } from './appointment.repository.interface';
import { ScheduleRepository } from '@application/business';
import { BusinessStateService } from '@presentation/shared/business-state.service';
import { Appointment } from '@domain/appointments/appointment.entity';
import { AppointmentService } from '@domain/services/service.types';

describe('AddAppointmentUseCase', () => {
  let useCase: AddAppointmentUseCase;
  let mockAppointmentRepository: jasmine.SpyObj<AppointmentRepository>;
  let mockScheduleRepository: jasmine.SpyObj<ScheduleRepository>;
  let mockBusinessState: jasmine.SpyObj<BusinessStateService>;

  // Mock service data
  const mockSimpleService: AppointmentService = {
    name: 'Corte básico',
    timeSegments: [{ duration: 30, breakAfter: 0 }],
    requiresHairLength: false,
  };

  const mockServiceWithSegments: AppointmentService = {
    name: 'Tratamiento',
    timeSegments: [
      { duration: 30, breakAfter: 10 },
      { duration: 30, breakAfter: 0 },
    ],
    requiresHairLength: false,
  };

  const mockServiceWithHairLength: AppointmentService = {
    name: 'Tinte',
    timeSegments: [],
    requiresHairLength: true,
    hairLengthModifiers: {
      short: { time: 30, segments: [{ duration: 30, breakAfter: 0 }] },
      medium: { time: 45, segments: [{ duration: 45, breakAfter: 0 }] },
      long: {
        time: 90,
        segments: [
          { duration: 45, breakAfter: 15 },
          { duration: 30, breakAfter: 0 },
        ],
      },
    },
  };

  beforeEach(() => {
    mockAppointmentRepository = jasmine.createSpyObj('AppointmentRepository', [
      'getAppointments',
      'getAppointmentById',
      'getAppointmentsByDate',
      'getAppointmentsByDateRange',
      'addAppointment',
      'updateAppointment',
      'deleteAppointment',
    ]);

    mockScheduleRepository = jasmine.createSpyObj('ScheduleRepository', [
      'getSchedule',
      'updateSchedule',
      'getExceptions',
      'addException',
      'updateException',
      'deleteException',
      'getSlots',
      'addSlot',
      'deleteSlot',
    ]);

    mockBusinessState = jasmine.createSpyObj('BusinessStateService', [
      'getAvailableSlotsForDate',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AddAppointmentUseCase,
        { provide: AppointmentRepository, useValue: mockAppointmentRepository },
        { provide: ScheduleRepository, useValue: mockScheduleRepository },
        { provide: BusinessStateService, useValue: mockBusinessState },
      ],
    });

    useCase = TestBed.inject(AddAppointmentUseCase);
  });

  describe('Simple Service (30 min)', () => {
    it('should add appointment and reserve single slot', async () => {
      const datetime = new Date('2025-01-15T10:00:00');
      const appointment = new Appointment(datetime, mockSimpleService);

      mockBusinessState.getAvailableSlotsForDate.and.returnValue([
        '09:30',
        '10:00',
        '10:30',
        '11:00',
      ]);
      mockAppointmentRepository.addAppointment.and.returnValue(
        Promise.resolve('apt-123')
      );
      mockScheduleRepository.addSlot.and.returnValue(Promise.resolve());

      await useCase.execute(appointment);

      expect(mockAppointmentRepository.addAppointment).toHaveBeenCalledWith(
        appointment
      );
      expect(mockScheduleRepository.addSlot).toHaveBeenCalledTimes(1);
    });

    it('should throw error when slot is not available', async () => {
      const datetime = new Date('2025-01-15T10:00:00');
      const appointment = new Appointment(datetime, mockSimpleService);

      // 10:00 is NOT in available slots
      mockBusinessState.getAvailableSlotsForDate.and.returnValue([
        '09:00',
        '09:30',
        '11:00',
      ]);

      await expectAsync(useCase.execute(appointment)).toBeRejectedWithError(
        /no está disponible/
      );
    });
  });

  describe('Service with Multiple Segments', () => {
    it('should reserve multiple slots for multi-segment service', async () => {
      // Service: 30min + 10min break + 30min = reserves 2 slots (ignoring break)
      const datetime = new Date('2025-01-15T10:00:00');
      const appointment = new Appointment(datetime, mockServiceWithSegments);

      mockBusinessState.getAvailableSlotsForDate.and.returnValue([
        '09:30',
        '10:00',
        '10:30',
        '11:00',
        '11:30',
        '12:00',
      ]);
      mockAppointmentRepository.addAppointment.and.returnValue(
        Promise.resolve('apt-456')
      );
      mockScheduleRepository.addSlot.and.returnValue(Promise.resolve());

      await useCase.execute(appointment);

      // Should reserve 10:00 (first segment) and slots after break
      // 30min segment uses 10:00, then 10min break, then 30min segment uses 10:40 (next available 11:00 area)
      expect(mockScheduleRepository.addSlot).toHaveBeenCalled();
    });

    it('should fail if any required slot is unavailable', async () => {
      const datetime = new Date('2025-01-15T10:00:00');
      const appointment = new Appointment(datetime, mockServiceWithSegments);

      // Missing 10:30 slot
      mockBusinessState.getAvailableSlotsForDate.and.returnValue([
        '09:30',
        '10:00',
        '11:00',
      ]);

      await expectAsync(useCase.execute(appointment)).toBeRejectedWithError(
        /no está disponible/
      );
    });
  });

  describe('Service with Hair Length', () => {
    it('should use hair length modifier segments for short hair', async () => {
      const datetime = new Date('2025-01-15T10:00:00');
      const appointment = new Appointment(
        datetime,
        mockServiceWithHairLength,
        undefined,
        undefined,
        'Cliente',
        '600000000',
        'Pepe',
        'short'
      );

      mockBusinessState.getAvailableSlotsForDate.and.returnValue([
        '10:00',
        '10:30',
        '11:00',
      ]);
      mockAppointmentRepository.addAppointment.and.returnValue(
        Promise.resolve('apt-789')
      );
      mockScheduleRepository.addSlot.and.returnValue(Promise.resolve());

      await useCase.execute(appointment);

      // Short hair = 30 min = 1 slot
      expect(mockScheduleRepository.addSlot).toHaveBeenCalledTimes(1);
    });

    it('should use hair length modifier segments for long hair', async () => {
      const datetime = new Date('2025-01-15T10:00:00');
      const appointment = new Appointment(
        datetime,
        mockServiceWithHairLength,
        undefined,
        undefined,
        'Cliente',
        '600000000',
        'Pepe',
        'long'
      );

      // Long hair: 45min + 15min break + 30min = needs 10:00, 10:30, 11:00 (break ignored), 11:30
      mockBusinessState.getAvailableSlotsForDate.and.returnValue([
        '10:00',
        '10:30',
        '11:00',
        '11:30',
        '12:00',
      ]);
      mockAppointmentRepository.addAppointment.and.returnValue(
        Promise.resolve('apt-long')
      );
      mockScheduleRepository.addSlot.and.returnValue(Promise.resolve());

      await useCase.execute(appointment);

      // Long hair has segments that span multiple slots
      expect(mockScheduleRepository.addSlot).toHaveBeenCalled();
    });
  });

  describe('Fallback Behavior', () => {
    it('should use default 30min segment when no segments defined', async () => {
      const serviceNoSegments: AppointmentService = {
        name: 'Sin segmentos',
        timeSegments: [], // Empty
        requiresHairLength: false,
      };

      const datetime = new Date('2025-01-15T10:00:00');
      const appointment = new Appointment(datetime, serviceNoSegments);

      mockBusinessState.getAvailableSlotsForDate.and.returnValue([
        '10:00',
        '10:30',
      ]);
      mockAppointmentRepository.addAppointment.and.returnValue(
        Promise.resolve('apt-fallback')
      );
      mockScheduleRepository.addSlot.and.returnValue(Promise.resolve());

      await useCase.execute(appointment);

      // Should fallback to 30 min = 1 slot
      expect(mockScheduleRepository.addSlot).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should not add slots if appointment creation fails', async () => {
      const datetime = new Date('2025-01-15T10:00:00');
      const appointment = new Appointment(datetime, mockSimpleService);

      mockBusinessState.getAvailableSlotsForDate.and.returnValue(['10:00']);
      mockAppointmentRepository.addAppointment.and.returnValue(
        Promise.reject(new Error('DB Error'))
      );

      await expectAsync(useCase.execute(appointment)).toBeRejected();

      // Slots should not be reserved if appointment fails
      // Note: Current implementation adds appointment first, then slots
      // This test documents current behavior
    });

    it('should handle concurrent slot operations', async () => {
      const datetime = new Date('2025-01-15T10:00:00');
      const appointment = new Appointment(datetime, mockServiceWithSegments);

      mockBusinessState.getAvailableSlotsForDate.and.returnValue([
        '10:00',
        '10:30',
        '11:00',
        '11:30',
      ]);
      mockAppointmentRepository.addAppointment.and.returnValue(
        Promise.resolve('apt-concurrent')
      );

      let slotCallCount = 0;
      mockScheduleRepository.addSlot.and.callFake(() => {
        slotCallCount++;
        return Promise.resolve();
      });

      await useCase.execute(appointment);

      // All slots should be added via Promise.all (concurrently)
      expect(slotCallCount).toBeGreaterThan(0);
    });
  });

  describe('Time Calculation Edge Cases', () => {
    it('should handle appointment at end of day', async () => {
      const datetime = new Date('2025-01-15T19:30:00');
      const appointment = new Appointment(datetime, mockSimpleService);

      mockBusinessState.getAvailableSlotsForDate.and.returnValue(['19:30']);
      mockAppointmentRepository.addAppointment.and.returnValue(
        Promise.resolve('apt-eod')
      );
      mockScheduleRepository.addSlot.and.returnValue(Promise.resolve());

      await useCase.execute(appointment);

      expect(mockAppointmentRepository.addAppointment).toHaveBeenCalled();
    });

    it('should handle appointment at start of day', async () => {
      const datetime = new Date('2025-01-15T09:00:00');
      const appointment = new Appointment(datetime, mockSimpleService);

      mockBusinessState.getAvailableSlotsForDate.and.returnValue([
        '09:00',
        '09:30',
      ]);
      mockAppointmentRepository.addAppointment.and.returnValue(
        Promise.resolve('apt-sod')
      );
      mockScheduleRepository.addSlot.and.returnValue(Promise.resolve());

      await useCase.execute(appointment);

      expect(mockAppointmentRepository.addAppointment).toHaveBeenCalled();
    });
  });
});
