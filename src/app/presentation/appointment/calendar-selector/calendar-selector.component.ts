import { Component, inject, signal, computed, effect, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HourSelectorComponent } from './hour-selector/hour-selector.component';
import { BookingFormComponent } from './booking-form/booking-form.component';
import { Barber, Service, ScheduleDay, ExceptionItem, PastDateHandler, ExceptionHandler, WeeklyScheduleHandler, AvailabilityContext, Appointment } from '@domain/index';
import { TimeUtils } from '@domain/shared/utils/time.utils';
import { AlertService } from '../../../shared/alert/alert.service';
import { GetAvailableSlotsForDayUseCase } from '@application/business/schedule/slots/get-available-slots-for-day.use-case';
import { GetScheduleUseCase, GetExceptionsUseCase, GetBarberSettingsUseCase } from '@application/business';
import { AddAppointmentUseCase } from '@application/appointments/add-appointment.use-case';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-calendar-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HourSelectorComponent,
    BookingFormComponent
  ],
  templateUrl: './calendar-selector.component.html',
  styleUrls: ['./calendar-selector.component.scss']
})
export class CalendarSelectorComponent implements AfterViewInit {
  // Dependencies
  private getAvailableSlotsUseCase = inject(GetAvailableSlotsForDayUseCase);
  private getScheduleUseCase = inject(GetScheduleUseCase);
  private getExceptionsUseCase = inject(GetExceptionsUseCase);
  private getBarberSettingsUseCase = inject(GetBarberSettingsUseCase);
  private addAppointmentUseCase = inject(AddAppointmentUseCase);
  private toast = inject(AlertService);

  // State Signals
  public selectedYear = signal(new Date().getFullYear());
  public selectedMonth = signal(new Date().getMonth());
  public showPicker = signal(false);
  
  public selectedDate = signal<Date | null>(null);
  public selectedHour = signal<string | null>(null);
  
  // Data Signals
  public schedule = signal<ScheduleDay[]>([]);
  public exceptions = signal<ExceptionItem[]>([]);
  public barbers = signal<Barber[]>([]);
  public allowBarberSelection = signal(false);
  
  public availableHours = signal<string[]>([]);
  public isSubmitting = signal(false);

  // Constants
  public readonly monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  public readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  public readonly phoneOnlyDays = [5, 6]; // Viernes y Sábado
  public readonly years: number[] = [];

  @ViewChild('monthYearBtn') monthYearBtn?: ElementRef<HTMLButtonElement>;

  // Computed
  public calendarMatrix = computed(() => {
    const year = this.selectedYear();
    const month = this.selectedMonth();
    const matrix: (Date | null)[][] = [];

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 7 : startDay; // Lunes = 1
    let currentDay = 1 - (startDay - 1);

    while (currentDay <= lastDayOfMonth.getDate()) {
      const week: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (currentDay > 0 && currentDay <= lastDayOfMonth.getDate()) {
          week.push(new Date(year, month, currentDay));
        } else {
          week.push(null);
        }
        currentDay++;
      }
      matrix.push(week);
    }
    return matrix;
  });

  public currentView = computed(() => {
    if (this.selectedHour()) return 'booking';
    if (this.selectedDate()) return 'hours';
    return 'calendar';
  });

  constructor() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 2; y++) this.years.push(y);
    
    this.loadData();
  }

  ngAfterViewInit() {
    // Focus logic can be implemented here if needed, using effects or direct DOM manipulation
    // For now, we'll keep it simple or adapt the old logic if strictly required
    setTimeout(() => this.focusFirstAvailableDay(), 0);
  }

  private async loadData() {
    try {
      const [schedule, exceptions, settings] = await Promise.all([
        firstValueFrom(this.getScheduleUseCase.execute()),
        firstValueFrom(this.getExceptionsUseCase.execute()),
        firstValueFrom(this.getBarberSettingsUseCase.execute())
      ]);

      this.schedule.set(schedule);
      this.exceptions.set(exceptions);

      const config = (settings as any).settings || settings;
      this.barbers.set((config.staff || []).filter((b: any) => b.visible));
      this.allowBarberSelection.set(config.barberSelection ?? false);

    } catch (error) {
      console.error('Error loading calendar data:', error);
      this.toast.error('Error al cargar los datos del calendario');
    }
  }

  public prevMonth() {
    let m = this.selectedMonth() - 1;
    let y = this.selectedYear();
    if (m < 0) {
      m = 11;
      y--;
    }
    this.selectedMonth.set(m);
    this.selectedYear.set(y);
    this.onDateChange();
  }

  public nextMonth() {
    let m = this.selectedMonth() + 1;
    let y = this.selectedYear();
    if (m > 11) {
      m = 0;
      y++;
    }
    this.selectedMonth.set(m);
    this.selectedYear.set(y);
    this.onDateChange();
  }

  // Actions
  public togglePicker() {
    this.showPicker.update(v => !v);
  }

  public onDateChange() {
    this.showPicker.set(false);
    // Focus restoration logic if needed
  }

  public async selectDate(date: Date | null) {
    if (!date || !this.isAvailable(date)) return;
    
    this.selectedDate.set(date);
    this.selectedHour.set(null); // Reset hour when date changes
    
    // Load available slots
    try {
      // Pass the Date object directly, not a string
      const slots = await firstValueFrom(this.getAvailableSlotsUseCase.execute(date));
      this.availableHours.set(slots);
    } catch (error) {
      console.error('Error loading slots:', error);
      this.toast.error('No se pudieron cargar las horas disponibles');
      this.availableHours.set([]);
    }
  }

  public onHourSelected(hour: string) {
    this.selectedHour.set(hour);
  }

  public onBackToCalendar() {
    this.selectedDate.set(null);
    this.selectedHour.set(null);
    this.availableHours.set([]);
  }

  public onBackToHours() {
    this.selectedHour.set(null);
  }

  public async onBookingSubmit(data: {
    name: string;
    phone: string;
    description?: string;
    barber?: string;
    service: Service;
    hairLength?: 'short' | 'medium' | 'long' | null;
  }) {
    const date = this.selectedDate();
    const time = this.selectedHour();
    
    if (!date || !time) return;

    this.isSubmitting.set(true);

    try {
      // Construct full datetime
      const [hours, minutes] = time.split(':').map(Number);
      const appointmentDate = new Date(date);
      appointmentDate.setHours(hours, minutes, 0, 0);

      // Create Appointment entity
      const appointment = new Appointment(
        appointmentDate,
        data.service, // Assuming Service is compatible with AppointmentService
        undefined, // id
        data.description,
        data.name,
        data.phone,
        data.barber,
        data.hairLength || undefined
      );

      await this.addAppointmentUseCase.execute(appointment);

      this.toast.success('Reserva confirmada con éxito');
      // Reset or redirect
      this.selectedDate.set(null);
      this.selectedHour.set(null);
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      this.toast.error('Error al crear la reserva. Inténtalo de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Helpers
  public isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  }

  public isSelected(date: Date | null): boolean {
    const selected = this.selectedDate();
    if (!date || !selected) return false;
    return date.getTime() === selected.getTime();
  }

  public isAvailable(date: Date | null): boolean {
    if (!date) return false;
    if (date.getMonth() !== this.selectedMonth()) return false; // Disable days from other months
    
    const context: AvailabilityContext = {
      date: date,
      schedule: this.schedule(),
      exceptions: this.exceptions()
    };

    // Instantiate handlers
    const pastDateHandler = new PastDateHandler();
    const exceptionHandler = new ExceptionHandler();
    const weeklyScheduleHandler = new WeeklyScheduleHandler();

    // Chain them
    pastDateHandler.setNext(exceptionHandler).setNext(weeklyScheduleHandler);

    // Execute chain
    const result = pastDateHandler.handle(context);

    return result.isAvailable;
  }

  public isPhoneOnly(date: Date): boolean {
    // Logic for phone only days (e.g. weekends)
    // This might need to be more sophisticated or come from config
    // For now using the hardcoded array
    return this.phoneOnlyDays.includes(date.getDay());
  }

  public formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Navigation Helpers (Simplified for brevity, can be expanded)
  private focusFirstAvailableDay() {
    // Implementation similar to before but using signals/DOM
    // This is a nice-to-have for accessibility
  }
}
