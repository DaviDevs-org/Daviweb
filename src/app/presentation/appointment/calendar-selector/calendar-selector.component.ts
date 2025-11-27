import { Component, EventEmitter, Output, OnDestroy, inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { isPlatformBrowser, NgClass, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HourSelectorComponent } from './hour-selector/hour-selector.component';
import { BookingFormComponent } from './booking-form/booking-form.component';
import { Subject, firstValueFrom } from 'rxjs';
import { Barber, Service, ScheduleDay, ExceptionItem } from '@domain/index';
import { ChangeDetectorRef } from '@angular/core';
import { AlertService } from '../../../shared/alert/alert.service';
import { GetAvailableSlotsForDayUseCase } from '@application/business/schedule/slots/get-available-slots-for-day.use-case';
import { GetScheduleUseCase, GetExceptionsUseCase, GetBarberSettingsUseCase } from '@application/business';
import { AddAppointmentUseCase } from '@application/appointments/add-appointment.use-case';
import { PastDateHandler, ExceptionHandler, WeeklyScheduleHandler, AvailabilityContext } from '@domain/index';

@Component({
  selector: 'app-calendar-selector',
  templateUrl: './calendar-selector.component.html',
  imports: [
    NgForOf,
    FormsModule,
    NgIf,
    NgClass,
    HourSelectorComponent,
    BookingFormComponent
  ],
  styleUrls: ['./calendar-selector.component.scss']
})
export class CalendarSelectorComponent implements OnDestroy {
  // Día actualmente enfocado para navegación por teclado
  focusedDay: Date | null = null;


  /** Cuando el calendario se renderiza, enfoca el día seleccionado o el primero disponible */
  ngAfterViewInit() {
    setTimeout(() => {
      this.focusFirstAvailableDay();
    }, 0);
  }
  /** Maneja la navegación por teclado en el calendario */
  onDayKeydown(event: KeyboardEvent, day: Date | null) {
    if (!day || !this.isAvailable(day)) return;
    const key = event.key;
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.selectDate(day);
      return;
    }
    // Navegación con flechas
    const pos = this.findDayPosition(day);
    if (!pos) return;
    let { weekIdx, dayIdx } = pos;
    let nextDay: Date | null = null;
    if (key === 'ArrowRight') {
      nextDay = this.findNextAvailableDay(weekIdx, dayIdx, 0, 1);
    } else if (key === 'ArrowLeft') {
      nextDay = this.findNextAvailableDay(weekIdx, dayIdx, 0, -1);
    } else if (key === 'ArrowDown') {
      nextDay = this.findNextAvailableDay(weekIdx, dayIdx, 1, 0);
    } else if (key === 'ArrowUp') {
      nextDay = this.findNextAvailableDay(weekIdx, dayIdx, -1, 0);
    }
    if (nextDay) {
      event.preventDefault();
      this.focusedDay = nextDay;
      this.focusDayElement(nextDay);
    }
  }

  /** Busca la posición de un día en la matriz */
  findDayPosition(day: Date): { weekIdx: number, dayIdx: number } | null {
    for (let weekIdx = 0; weekIdx < this.calendarMatrix.length; weekIdx++) {
      const week = this.calendarMatrix[weekIdx];
      for (let dayIdx = 0; dayIdx < week.length; dayIdx++) {
        const d = week[dayIdx];
        if (d && this.formatDate(d) === this.formatDate(day)) {
          return { weekIdx, dayIdx };
        }
      }
    }
    return null;
  }

  /** Busca el siguiente día disponible en la dirección indicada */
  findNextAvailableDay(weekIdx: number, dayIdx: number, weekStep: number, dayStep: number): Date | null {
    let w = weekIdx + weekStep;
    let d = dayIdx + dayStep;
    while (w >= 0 && w < this.calendarMatrix.length) {
      const week = this.calendarMatrix[w];
      while (d >= 0 && d < week.length) {
        const candidate = week[d];
        if (candidate && this.isAvailable(candidate)) {
          return candidate;
        }
        d += dayStep;
      }
      d = dayStep > 0 ? 0 : week.length - 1;
      w += weekStep;
    }
    return null;
  }

  /** Enfoca el elemento del día en el DOM */
  focusDayElement(day: Date) {
    const selector = `[data-day='${this.formatDate(day)}']`;
    const el = document.querySelector(selector) as HTMLElement;
    if (el) {
      el.focus();
    }
  }
  focusFirstAvailableDay() {
    for (const week of this.calendarMatrix) {
      for (const day of week) {
        if (day && this.isAvailable(day)) {
          this.focusedDay = day;
          return;
        }
      }
    }
  }
  /** Formatea la fecha como yyyy-mm-dd para data-day y lógica interna */
  public formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  /** Devuelve true si el día está deshabilitado (fuera del mes actual o no reservable) */
  isDisabled(day: Date): boolean {
    // Deshabilitar días fuera del mes actual
    return day.getMonth() !== this.selectedMonth;
    // Si quieres deshabilitar días no reservables, añade lógica aquí
  }

  // Implementaciones duplicadas eliminadas. Se mantienen las versiones correctas más abajo.

  @Output() dateSelected = new EventEmitter<Date>();

  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  /** Días que sólo admiten reserva telefónica (por defecto: viernes=5 y sábado=6).
   *  Se usa Date.getDay(): 0=Domingo ... 6=Sábado. Pueden cambiarse dinámicamente si se requiere.
   */
  phoneOnlyDays: number[] = [5, 6];

  years: number[] = [];
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth();
  showPicker = false;

  calendarMatrix: (Date | null)[][] = [];
  selectedDate: Date | null = null;
  selectedHour: string | null = null;

  showHours = false;
  showForm = false;
  isSubmitting = false;

  availableHoursForSelectedDate: { value: string; disabled: boolean }[] = [];

  schedule: ScheduleDay[] = [];
  exceptions: ExceptionItem[] = [];
  barbers: Barber[] = [];
  allowBarberSelection = false;

  private destroy$ = new Subject<void>();
  private platformId = inject(PLATFORM_ID)
  @ViewChild('monthYearBtn') monthYearBtn?: ElementRef<HTMLButtonElement>;

  constructor(
    private getAvailableSlotsUseCase: GetAvailableSlotsForDayUseCase,
    private getScheduleUseCase: GetScheduleUseCase,
    private getExceptionsUseCase: GetExceptionsUseCase,
    private getBarberSettingsUseCase: GetBarberSettingsUseCase,
    private addAppointmentUseCase: AddAppointmentUseCase,
    private cdr: ChangeDetectorRef,
    private toast: AlertService
  ) {
    const startYear = this.selectedYear - 2;
    const endYear = this.selectedYear + 2;
    for (let y = startYear; y <= endYear; y++) this.years.push(y);

    this.generateCalendar();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadData() {
    try {
      this.schedule = await firstValueFrom(this.getScheduleUseCase.execute());
      this.exceptions = await firstValueFrom(this.getExceptionsUseCase.execute());

      await this.loadBarbers();
    } catch (error) {
      console.error('Error cargando datos del calendario:', error);
      this.toast.error('Error al cargar los datos del calendario');
    }
  }

  private async loadBarbers() {
    try {
      const settings = await firstValueFrom(this.getBarberSettingsUseCase.execute());
      const config = (settings as any).settings || settings;
      this.barbers = (config.staff || []).filter((b: any) => b.visible);
      this.allowBarberSelection = config.barberSelection ?? false;

      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error cargando barberos:', err);
      this.barbers = [];
    }
  }

  togglePicker() { this.showPicker = !this.showPicker; }
  onDateChange() {
    this.showPicker = false;
    this.generateCalendar();
    // Restaurar foco al cambiar de mes para mejorar la navegación por teclado
    this.restoreFocusAfterMonthChange();
  }

  generateCalendar() {
    this.calendarMatrix = [];
    const firstDayOfMonth = new Date(this.selectedYear, this.selectedMonth, 1);
    const lastDayOfMonth = new Date(this.selectedYear, this.selectedMonth + 1, 0);

    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 7 : startDay;
    let currentDay = 1 - (startDay - 1);

    while (currentDay <= lastDayOfMonth.getDate()) {
      const week: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (currentDay > 0 && currentDay <= lastDayOfMonth.getDate()) {
          week.push(new Date(this.selectedYear, this.selectedMonth, currentDay));
        } else week.push(null);
        currentDay++;
      }
      this.calendarMatrix.push(week);
    }
  }

  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
  }

  isSelected(date: Date | null): boolean {
    return !!date && !!this.selectedDate && date.getTime() === this.selectedDate.getTime();
  }

  private getDayName(date: Date): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[date.getDay()];
  }

  isAvailable(date: Date | null): boolean {
    if (!date) return false;
    
    const context: AvailabilityContext = {
        date,
        schedule: this.schedule,
        exceptions: this.exceptions
    };

    const pastDateHandler = new PastDateHandler();
    const exceptionHandler = new ExceptionHandler();
    const weeklyScheduleHandler = new WeeklyScheduleHandler();

    pastDateHandler.setNext(exceptionHandler).setNext(weeklyScheduleHandler);

    return pastDateHandler.handle(context).isAvailable;
  }

  /** Indica si el día está marcado como de cita sólo telefónica.
   *  No impide que aparezca como disponible; únicamente bloquea la reserva directa al seleccionar.
   */
  private isPhoneOnlyDay(date: Date | null): boolean {
    if (!date) return false;
    return this.phoneOnlyDays.includes(date.getDay());
  }

  selectDate(date: Date | null) {
    if (!date) return;

    if (!this.isAvailable(date)) {
      this.toast.error('No hay horas disponibles para este día');
      return;
    }

    // Bloquear días que sólo admiten reserva telefónica (manteniendo apariencia de disponibilidad)
    if (this.isPhoneOnlyDay(date)) {
      this.toast.error('Este día sólo admite reservas telefónicas. Por favor, llámanos para reservar.');
      return;
    }

    this.getAvailableSlotsUseCase.execute(date).subscribe({
        next: (slots) => {
            if (slots.length === 0) {
                this.toast.error('No hay horas disponibles para este día');
                return;
            }
            
            this.availableHoursForSelectedDate = slots.map(s => ({ value: s, disabled: false }));
            
            this.selectedDate = date;
            this.dateSelected.emit(date);
            this.showHours = true;
            this.showForm = false;
        },
        error: (err) => {
            this.toast.error('Error al cargar horas disponibles');
            console.error(err);
        }
    });
  }

  prevMonth() {
    if (this.selectedMonth === 0) {
      this.selectedMonth = 11;
      this.selectedYear--;
    } else {
      this.selectedMonth--;
    }
    this.onDateChange();
  }

  nextMonth() {
    if (this.selectedMonth === 11) {
      this.selectedMonth = 0;
      this.selectedYear++;
    } else {
      this.selectedMonth++;
    }
    this.onDateChange();
  }

  backToCalendar() {
    this.showHours = false;
    this.showForm = false;
    this.selectedDate = null;
    this.selectedHour = null;
  }

  onHourSelected(hour: string) {
    this.selectedHour = hour;
    this.showHours = false;
    this.showForm = true;
  }

  async handleFormSubmit(data: { name: string; phone: string; description?: string; barber?: string, service: Service, hairLength?: 'short' | 'medium' | 'long' | null }) {
    if (!this.selectedDate || !this.selectedHour) {
      this.toast.error('Error: Fecha u hora no seleccionada');
      return;
    }
    if (this.isSubmitting) return;

    const bookingData = {
      date: this.selectedDateString,
      time: this.selectedHour,
      ...data,
      hairLengthChoice: data.hairLength ?? null
    } as any;
    this.isSubmitting = true;
    try {
      await this.addAppointmentUseCase.execute(bookingData);
      this.toast.success('Cita guardada correctamente');
      this.resetAll();
      this.loadData();
    } catch (error: any) {
      console.error('Error guardando la cita:', error);
      this.toast.error('Error al guardar la cita: ' + (error.message || JSON.stringify(error)));
    } finally {
      this.isSubmitting = false;
    }
  }

  resetAll() {
    this.selectedDate = null;
    this.selectedHour = null;
    this.showForm = false;
    this.showHours = false;
  }

  get selectedDateString(): string {
    return this.selectedDate ? this.formatDate(this.selectedDate) : '';
  }

  // Implementación duplicada eliminada. Se mantiene la versión principal.

  private restoreFocusAfterMonthChange() {
    // Solo en browser
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      try {
        // Intentar enfocar el primer botón de día disponible
        const firstDayBtn = document.querySelector('[data-day]') as HTMLElement | null;
        if (firstDayBtn) {
          firstDayBtn.focus();
          return;
        }

        // Si no hay día, enfocar el botón del mes
        if (this.monthYearBtn && this.monthYearBtn.nativeElement) {
          this.monthYearBtn.nativeElement.focus();
        }
      } catch (e) {
        // cualquier error no debe romper la UI
        console.warn('restoreFocusAfterMonthChange error', e);
      }
    }, 0);
  }
}