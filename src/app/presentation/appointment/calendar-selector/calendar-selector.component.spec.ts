import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { CalendarSelectorComponent } from './calendar-selector.component';
import { BusinessStateService } from '@presentation/shared/business-state.service';
import { AddAppointmentUseCase } from '@application/appointments/add-appointment.use-case';
import { AlertService } from '../../shared/alert/alert.service';
import { Service, Appointment } from '@domain/index';
import { ScheduleDay, ExceptionItem, Interval, BarberSettings } from '@domain/index';

describe('CalendarSelectorComponent', () => {
  let fixture: ComponentFixture<CalendarSelectorComponent>;
  let component: CalendarSelectorComponent;

  let businessStateSpy: {
    rawSchedule: ReturnType<typeof signal>;
    exceptions: ReturnType<typeof signal>;
    appointments: ReturnType<typeof signal>;
    barberSettings: ReturnType<typeof signal>;
    getAvailableSlotsForDate: jasmine.Spy;
  };

  let addAppointmentSpy: jasmine.SpyObj<AddAppointmentUseCase>;
  let alertSpy: jasmine.SpyObj<AlertService>;

  beforeEach(async () => {
  const monday = new ScheduleDay(
    'lunes',          // day key used in schedule
    'Lunes',          // display name
    false,            // closed = false
    [new Interval('09:00', '18:00')]
  );

  businessStateSpy = {
    rawSchedule: signal<ScheduleDay[]>([monday]),
    exceptions: signal<ExceptionItem[]>([]),
    appointments: signal<Appointment[]>([]),
    barberSettings: signal<BarberSettings | null>(null),
    getAvailableSlotsForDate: jasmine.createSpy('getAvailableSlotsForDate'),
    // add other signals if your component uses them
  };

    addAppointmentSpy = jasmine.createSpyObj<AddAppointmentUseCase>(
      'AddAppointmentUseCase',
      ['execute'],
    );

    alertSpy = jasmine.createSpyObj<AlertService>('AlertService', [
      'success',
      'error',
    ]);

    await TestBed.configureTestingModule({
      imports: [CalendarSelectorComponent],
      providers: [
        { provide: BusinessStateService, useValue: businessStateSpy },
        { provide: AddAppointmentUseCase, useValue: addAppointmentSpy },
        { provide: AlertService, useValue: alertSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create with initial calendar view', () => {
    expect(component).toBeTruthy();
    expect(component.currentView()).toBe('calendar');
    expect(component.selectedDate()).toBeNull();
    expect(component.selectedHour()).toBeNull();
  });

  it('should go to next and previous month correctly', () => {
    const startMonth = component.selectedMonth();
    const startYear = component.selectedYear();

    component.nextMonth();
    if (startMonth === 11) {
      expect(component.selectedMonth()).toBe(0);
      expect(component.selectedYear()).toBe(startYear + 1);
    } else {
      expect(component.selectedMonth()).toBe(startMonth + 1);
      expect(component.selectedYear()).toBe(startYear);
    }

    component.prevMonth();
    expect(component.selectedMonth()).toBe(startMonth);
    expect(component.selectedYear()).toBe(startYear);
  });

  it('should load available hours on date select', async () => {
    const date = new Date(component.selectedYear(), component.selectedMonth(), 15);
    spyOn(component, 'isAvailable').and.returnValue(true);
    businessStateSpy.getAvailableSlotsForDate.and.returnValue(['10:00', '10:30']);

    await component.selectDate(date);

    expect(component.selectedDate()).toEqual(date);
    expect(component.selectedHour()).toBeNull();
    expect(businessStateSpy.getAvailableSlotsForDate).toHaveBeenCalledWith(date);
    expect(component.availableHours()).toEqual(['10:00', '10:30']);
  });

  it('should handle errors when loading slots', async () => {
    const date = new Date(component.selectedYear(), component.selectedMonth(), 15);
    spyOn(component, 'isAvailable').and.returnValue(true);
    businessStateSpy.getAvailableSlotsForDate.and.throwError('boom');

    await component.selectDate(date);

    expect(alertSpy.error).toHaveBeenCalledWith(
      'No se pudieron cargar las horas disponibles',
    );
    expect(component.availableHours()).toEqual([]);
  });

  it('should update selected hour and navigation state', () => {
    const date = new Date();
    component.selectedDate.set(date); 
    
    component.onHourSelected('10:00');
    expect(component.selectedHour()).toBe('10:00');
    expect(component.currentView()).toBe('booking');

    component.onBackToHours();
    expect(component.selectedHour()).toBeNull();
    expect(component.currentView()).toBe('hours');

    component.onBackToCalendar();
    expect(component.selectedDate()).toBeNull();
    expect(component.selectedHour()).toBeNull();
    expect(component.availableHours()).toEqual([]);
    expect(component.currentView()).toBe('calendar');
  });

  it('should correctly detect today and selected date', () => {
    const today = new Date();
    expect(component.isToday(today)).toBeTrue();

    const other = new Date(2000, 0, 1);
    expect(component.isToday(other)).toBeFalse();

    component.selectedDate.set(today);
    expect(component.isSelected(today)).toBeTrue();
    expect(component.isSelected(other)).toBeFalse();
  });

  it('should format date as YYYY-MM-DD', () => {
    const d = new Date(2025, 0, 5); // 5 Jan 2025
    expect(component.formatDate(d)).toBe('2025-01-05');
  });

  it('should submit booking and call addAppointmentUseCase on success', async () => {
    const date = new Date(2025, 0, 15);
    component.selectedDate.set(date);
    component.selectedHour.set('10:30');

    const mockService = {} as Service;

    addAppointmentSpy.execute.and.returnValue(Promise.resolve());

    const data = {
      name: 'John',
      phone: '600000000',
      description: 'Test',
      barber: 'Pepe',
      service: mockService,
      hairLength: 'short' as const,
    };

    await component.onBookingSubmit(data);

    expect(addAppointmentSpy.execute).toHaveBeenCalled();
    const calledAppointment = addAppointmentSpy.execute.calls.mostRecent()
      .args[0] as Appointment;
    expect(calledAppointment.datetime.getHours()).toBe(10);
    expect(calledAppointment.datetime.getMinutes()).toBe(30);
    expect(alertSpy.success).toHaveBeenCalledWith('Reserva confirmada con éxito');
    expect(component.selectedDate()).toBeNull();
    expect(component.selectedHour()).toBeNull();
    expect(component.isSubmitting()).toBeFalse();
  });

  it('should show error toast when booking fails', async () => {
    const date = new Date(2025, 0, 15);
    component.selectedDate.set(date);
    component.selectedHour.set('10:30');

    const mockService = {} as Service;

    addAppointmentSpy.execute.and.returnValue(
      Promise.reject(new Error('Boom')),
    );

    const data = {
      name: 'John',
      phone: '600000000',
      description: 'Test',
      barber: 'Pepe',
      service: mockService,
      hairLength: 'short' as const,
    };

    await component.onBookingSubmit(data);

    expect(alertSpy.error).toHaveBeenCalled();
    expect(component.isSubmitting()).toBeFalse();
  });
});

