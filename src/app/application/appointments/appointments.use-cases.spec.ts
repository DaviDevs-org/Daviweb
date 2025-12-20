import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GetAppointmentsUseCase } from './get-appointments.use-case';
import { GetAppointmentsByDateRangeUseCase } from './get-appointments-by-date.use-case';
import { GetAppointmentByIdUseCase } from './get-appointment-by-id.use-case';
import { GetAppointmentsByDateUseCase } from './get-appointment-by-date-range.use-case';
import { DeleteAppointmentUseCase } from './delete-appointment.use-case';
import { AppointmentRepository } from './appointment.repository.interface';
import { Appointment } from '@domain/appointments/appointment.entity';
import { AppointmentService } from '@domain/services/service.types';

describe('Appointment Use Cases', () => {
  // Mock service for appointments
  const mockService: AppointmentService = {
    name: 'Corte de pelo',
    timeSegments: [{ duration: 30, breakAfter: 0 }],
    requiresHairLength: false,
  };

  // Sample appointments for testing
  const createMockAppointments = (): Appointment[] => [
    new Appointment(
      new Date('2025-01-15T10:00:00'),
      mockService,
      'apt-1',
      'Cliente 1',
      'Juan',
      '600111222'
    ),
    new Appointment(
      new Date('2025-01-15T11:00:00'),
      mockService,
      'apt-2',
      'Cliente 2',
      'María',
      '600333444'
    ),
    new Appointment(
      new Date('2025-01-16T09:00:00'),
      mockService,
      'apt-3',
      'Cliente 3',
      'Pedro',
      '600555666'
    ),
  ];

  describe('GetAppointmentsUseCase', () => {
    let useCase: GetAppointmentsUseCase;
    let mockRepository: jasmine.SpyObj<AppointmentRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('AppointmentRepository', [
        'getAppointments',
        'getAppointmentById',
        'getAppointmentsByDate',
        'getAppointmentsByDateRange',
        'addAppointment',
        'updateAppointment',
        'deleteAppointment',
      ]);

      TestBed.configureTestingModule({
        providers: [
          GetAppointmentsUseCase,
          { provide: AppointmentRepository, useValue: mockRepository },
        ],
      });

      useCase = TestBed.inject(GetAppointmentsUseCase);
    });

    it('should be created', () => {
      expect(useCase).toBeTruthy();
    });

    it('should return all appointments from repository', (done) => {
      const mockAppointments = createMockAppointments();
      mockRepository.getAppointments.and.returnValue(of(mockAppointments));

      useCase.execute().subscribe((appointments) => {
        expect(appointments).toEqual(mockAppointments);
        expect(appointments.length).toBe(3);
        expect(mockRepository.getAppointments).toHaveBeenCalledTimes(1);
        done();
      });
    });

    it('should return empty array when no appointments', (done) => {
      mockRepository.getAppointments.and.returnValue(of([]));

      useCase.execute().subscribe((appointments) => {
        expect(appointments).toEqual([]);
        done();
      });
    });

    it('should propagate errors from repository', (done) => {
      const error = new Error('Database connection failed');
      mockRepository.getAppointments.and.returnValue(throwError(() => error));

      useCase.execute().subscribe({
        error: (err) => {
          expect(err.message).toBe('Database connection failed');
          done();
        },
      });
    });
  });

  describe('GetAppointmentsByDateUseCase', () => {
    let useCase: GetAppointmentsByDateUseCase;
    let mockRepository: jasmine.SpyObj<AppointmentRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('AppointmentRepository', [
        'getAppointments',
        'getAppointmentById',
        'getAppointmentsByDate',
        'getAppointmentsByDateRange',
        'addAppointment',
        'updateAppointment',
        'deleteAppointment',
      ]);

      TestBed.configureTestingModule({
        providers: [
          GetAppointmentsByDateUseCase,
          { provide: AppointmentRepository, useValue: mockRepository },
        ],
      });

      useCase = TestBed.inject(GetAppointmentsByDateUseCase);
    });

    it('should return appointments for specific date', (done) => {
      const targetDate = new Date('2025-01-15');
      const dayAppointments = createMockAppointments().slice(0, 2);
      mockRepository.getAppointmentsByDate.and.returnValue(of(dayAppointments));

      useCase.execute(targetDate).subscribe((appointments) => {
        expect(appointments).toEqual(dayAppointments);
        expect(appointments.length).toBe(2);
        expect(mockRepository.getAppointmentsByDate).toHaveBeenCalledWith(
          targetDate
        );
        done();
      });
    });

    it('should return empty array for date with no appointments', (done) => {
      const emptyDate = new Date('2025-12-31');
      mockRepository.getAppointmentsByDate.and.returnValue(of([]));

      useCase.execute(emptyDate).subscribe((appointments) => {
        expect(appointments).toEqual([]);
        done();
      });
    });
  });

  describe('GetAppointmentByIdUseCase', () => {
    let useCase: GetAppointmentByIdUseCase;
    let mockRepository: jasmine.SpyObj<AppointmentRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('AppointmentRepository', [
        'getAppointments',
        'getAppointmentById',
        'getAppointmentsByDate',
        'getAppointmentsByDateRange',
        'addAppointment',
        'updateAppointment',
        'deleteAppointment',
      ]);

      TestBed.configureTestingModule({
        providers: [
          GetAppointmentByIdUseCase,
          { provide: AppointmentRepository, useValue: mockRepository },
        ],
      });

      useCase = TestBed.inject(GetAppointmentByIdUseCase);
    });

    it('should return appointment when found', (done) => {
      const mockAppointment = createMockAppointments()[0];
      mockRepository.getAppointmentById.and.returnValue(of(mockAppointment));

      useCase.execute('apt-1').subscribe((appointment) => {
        expect(appointment).toEqual(mockAppointment);
        expect(appointment?.id).toBe('apt-1');
        expect(mockRepository.getAppointmentById).toHaveBeenCalledWith('apt-1');
        done();
      });
    });

    it('should return null when appointment not found', (done) => {
      mockRepository.getAppointmentById.and.returnValue(of(null));

      useCase.execute('non-existent-id').subscribe((appointment) => {
        expect(appointment).toBeNull();
        done();
      });
    });
  });

  describe('GetAppointmentsByDateRangeUseCase', () => {
    let useCase: GetAppointmentsByDateRangeUseCase;
    let mockRepository: jasmine.SpyObj<AppointmentRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('AppointmentRepository', [
        'getAppointments',
        'getAppointmentById',
        'getAppointmentsByDate',
        'getAppointmentsByDateRange',
        'addAppointment',
        'updateAppointment',
        'deleteAppointment',
      ]);

      TestBed.configureTestingModule({
        providers: [
          GetAppointmentsByDateRangeUseCase,
          { provide: AppointmentRepository, useValue: mockRepository },
        ],
      });

      useCase = TestBed.inject(GetAppointmentsByDateRangeUseCase);
    });

    it('should return appointments within date range', (done) => {
      const startDate = new Date('2025-01-15');
      const endDate = new Date('2025-01-16');
      const mockAppointments = createMockAppointments();
      mockRepository.getAppointmentsByDateRange.and.returnValue(
        of(mockAppointments)
      );

      useCase.execute(startDate, endDate).subscribe((appointments) => {
        expect(appointments).toEqual(mockAppointments);
        expect(mockRepository.getAppointmentsByDateRange).toHaveBeenCalledWith(
          startDate,
          endDate
        );
        done();
      });
    });

    it('should handle week-long range', (done) => {
      const startDate = new Date('2025-01-13'); // Monday
      const endDate = new Date('2025-01-19'); // Sunday
      mockRepository.getAppointmentsByDateRange.and.returnValue(
        of(createMockAppointments())
      );

      useCase.execute(startDate, endDate).subscribe((appointments) => {
        expect(appointments.length).toBe(3);
        done();
      });
    });
  });

  describe('DeleteAppointmentUseCase', () => {
    let useCase: DeleteAppointmentUseCase;
    let mockRepository: jasmine.SpyObj<AppointmentRepository>;

    beforeEach(() => {
      mockRepository = jasmine.createSpyObj('AppointmentRepository', [
        'getAppointments',
        'getAppointmentById',
        'getAppointmentsByDate',
        'getAppointmentsByDateRange',
        'addAppointment',
        'updateAppointment',
        'deleteAppointment',
      ]);

      TestBed.configureTestingModule({
        providers: [
          DeleteAppointmentUseCase,
          { provide: AppointmentRepository, useValue: mockRepository },
        ],
      });

      useCase = TestBed.inject(DeleteAppointmentUseCase);
    });

    it('should delete appointment successfully', async () => {
      mockRepository.deleteAppointment.and.returnValue(Promise.resolve());

      await useCase.execute('apt-1');

      expect(mockRepository.deleteAppointment).toHaveBeenCalledWith('apt-1');
    });

    it('should propagate errors on delete failure', async () => {
      const error = new Error('Appointment not found');
      mockRepository.deleteAppointment.and.returnValue(Promise.reject(error));

      await expectAsync(useCase.execute('invalid-id')).toBeRejectedWithError(
        'Appointment not found'
      );
    });
  });
});
