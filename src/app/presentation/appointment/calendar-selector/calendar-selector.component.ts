import { Component, EventEmitter, Output, OnDestroy, inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { isPlatformBrowser, NgClass, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HourSelectorComponent } from './hour-selector/hour-selector.component';
import { BookingFormComponent } from './booking-form/booking-form.component';
import { ReservedSlotsService, ReservedSlot } from '../../../services/reserved-slots.service';
import { AppointmentService } from '../../../services/appointments.service';
import { Subject, firstValueFrom, combineLatest } from 'rxjs';
import { InfoManager } from '../../../services/admin-panel/info-management.service';
import { Barber, Service, ScheduleDay, ExceptionItem } from '../../../admin-panel/types/admin.types';
import { ChangeDetectorRef } from '@angular/core';
import { AlertService } from '../../../shared/alert/alert.service';
import { AppointmentManagerService } from '../../../services/admin-panel/appointment-management.service';
import { Appointment } from '../../../admin-panel/types/admin.types';
import { map } from 'rxjs/operators';

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
  availableHoursByDate: Record<string, string[]> = {};
  bookedSlotsByDate: Record<string, string[]> = {};

  // Nuevos datos desde InfoManager
  schedule: ScheduleDay[] = [];
  exceptions: ExceptionItem[] = [];
  barbers: Barber[] = [];
  allowBarberSelection = false;

  private destroy$ = new Subject<void>();
  private platformId = inject(PLATFORM_ID)
  @ViewChild('monthYearBtn') monthYearBtn?: ElementRef<HTMLButtonElement>;

  constructor(
    private reservedSlotsService: ReservedSlotsService,
    private appointmentService: AppointmentService,
    private infoManager: InfoManager,
    private cdr: ChangeDetectorRef,
    private toast: AlertService,
    private apptSvc: AppointmentManagerService
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
      // Cargar horario semanal y excepciones desde InfoManager
      this.schedule = await this.infoManager.getSchedule();
      this.exceptions = await this.infoManager.getExceptions();

      // Cargar slots reservados desde citas existentes
      await this.loadBookedSlotsFromAppointments();

      await this.loadBarbers();
      this.computeAvailableHoursForCurrentMatrix();
    } catch (error) {
      console.error('Error cargando datos del calendario:', error);
      this.toast.error('Error al cargar los datos del calendario');
    }
  }

  private async loadBookedSlotsFromAppointments() {
    // Usamos siempre los reservedSlots públicos
    const slots = await firstValueFrom(this.reservedSlotsService.getReservedSlotsFromNow());
    this.bookedSlotsByDate = {};
    (slots ?? []).forEach((slot: ReservedSlot) => {
      const dateKey = slot.date;
      if (!this.bookedSlotsByDate[dateKey]) this.bookedSlotsByDate[dateKey] = [];
      const norm = this.normalizeTime(slot.time);
      if (!this.bookedSlotsByDate[dateKey].includes(norm)) {
        this.bookedSlotsByDate[dateKey].push(norm);
      }
    });
  }

  private normalizeTime(t: string | undefined | null): string {
    if (!t) return '00:00';
    const [h, m] = t.split(':').map(v => Number(v));
    const hh = isNaN(h) ? 0 : h;
    const mm = isNaN(m) ? 0 : m;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  // Método helper para convertir tiempo a minutos
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  // Normalizar cita (copiado de appointment-management)
  private normalizeAppointment(a: Appointment): Appointment {
    const out: Appointment = { ...a };

    if (typeof a.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.date)) {
      out.dateISO = a.date;
    } else if (a.datetime?.seconds) {
      out.dateISO = this.toISODate(new Date(a.datetime.seconds * 1000));
    } else if (a.createdAt?.seconds) {
      out.dateISO = this.toISODate(new Date(a.createdAt.seconds * 1000));
    }

    if (a.time) {
      out.timeNormalized = a.time;
    } else if (a.datetime?.seconds) {
      const d = new Date(a.datetime.seconds * 1000);
      out.timeNormalized = this.pad(d.getHours()) + ':' + this.pad(d.getMinutes());
    } else {
      out.timeNormalized = '—';
    }

    return out;
  }

  // Obtener segmentos de tiempo de una cita (copiado de appointment-management)
  private getAppointmentTimeSegments(appointment: Appointment): { start: number, duration: number, type: 'active' | 'break' }[] {
    if (!appointment.timeNormalized || appointment.timeNormalized === '—') return [];

    const startMinutes = this.timeToMinutes(appointment.timeNormalized);
    const segments: { start: number, duration: number, type: 'active' | 'break' }[] = [];

    const svc = appointment.service as any;
    if (!svc) return [];
    const materialize = (s: any, length?: 'short' | 'medium' | 'long') => {
      if (!s?.requiresHairLength || !length) return s;
      const mod = s.hairLengthModifiers?.[length];
      if (!mod) return s;
      const segs = (mod.segments && mod.segments.length > 0)
        ? mod.segments
        : (mod.time && mod.time > 0 ? [{ duration: mod.time, breakAfter: 0 }] : []);
      return { ...s, timeSegments: segs, requiresHairLength: false };
    };
    const concrete = materialize(svc, appointment.hairLengthChoice || undefined);

    if (concrete.timeSegments && concrete.timeSegments.length > 0) {
      let currentTime = startMinutes;

      (concrete.timeSegments as { duration: number; breakAfter?: number }[]).forEach((segment, index) => {
        segments.push({ start: currentTime, duration: segment.duration, type: 'active' });
        currentTime += segment.duration;

        if (segment.breakAfter && segment.breakAfter > 0 && index < concrete.timeSegments.length - 1) {
          segments.push({ start: currentTime, duration: segment.breakAfter, type: 'break' });
          currentTime += segment.breakAfter;
        }
      });
      return segments;
    } else {
      // Servicio sin timeSegments, asumir 30 minutos por defecto
      segments.push({ start: startMinutes, duration: 30, type: 'active' });
    }

    return segments;
  }

  private toISODate(d: Date): string {
    return d.getFullYear() + '-' + this.pad(d.getMonth() + 1) + '-' + this.pad(d.getDate());
  }

  private pad(n: number): string {
    return n < 10 ? '0' + n : '' + n;
  }

  private async loadBarbers() {
    try {
      const settings = await this.infoManager.getBarberSettings();
      this.barbers = settings.settings.staff.filter(b => b.visible);
      this.allowBarberSelection = settings.settings.barberSelection;

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
    this.computeAvailableHoursForCurrentMatrix();
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

    // No permitir fechas pasadas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;

    const dateKey = this.formatDate(date);

    // Verificar si hay una excepción para esta fecha (PRIORIDAD)
    const exception = this.exceptions.find(ex => ex.date === dateKey);
    if (exception) {
      // Si hay excepción, verificar si está cerrada o tiene horarios
      return !exception.closed && exception.intervals.length > 0;
    }

    // Si no hay excepción, usar horario semanal normal
    const dayName = this.getDayName(date);
    const daySchedule = this.schedule.find(day => day.day === dayName);

    if (!daySchedule) return false;

    return !daySchedule.closed && daySchedule.intervals.length > 0;
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

    const dateKey = this.formatDate(date);
    const bookedHours = this.bookedSlotsByDate[dateKey] || [];

    const hoursWithStatus = this.getAvailableHoursForDate(date, bookedHours);

    if (!hoursWithStatus.length) {
      this.toast.error('No hay horas disponibles para este día');
      return;
    }

    this.availableHoursForSelectedDate = hoursWithStatus;

    // Guardar solo los valores en availableHoursByDate
    this.availableHoursByDate[dateKey] = hoursWithStatus.map(h => h.value);

    this.selectedDate = date;
    this.dateSelected.emit(date);
    this.showHours = true;
    this.showForm = false;
  }

  private getAvailableHoursForDate(date: Date, booked: string[]): { value: string; disabled: boolean }[] {
    const dateKey = this.formatDate(date);

    // Verificar si hay una excepción para esta fecha (PRIORIDAD)
    const exception = this.exceptions.find(ex => ex.date === dateKey);

    let hours: string[] = [];

    if (exception) {
      // Usar horarios de la excepción
      if (!exception.closed && exception.intervals) {
        exception.intervals.forEach(interval => {
          hours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    } else {
      // Usar horario semanal normal
      const dayName = this.getDayName(date);
      const daySchedule = this.schedule.find(day => day.day === dayName);

      if (daySchedule && !daySchedule.closed && daySchedule.intervals) {
        daySchedule.intervals.forEach(interval => {
          hours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    }

    // Ahora solo marcar como disabled los slots que están realmente ocupados por servicios ACTIVOS
    // Los breaks ya no cuentan como ocupados porque no se incluyen en bookedSlotsByDate
    return hours.map(h => ({
      value: h,
      disabled: booked.includes(h)
    }));
  }

  private hoursRangeFromOpenClose(open: string, close: string, step = 30): string[] {
    if (!open || !close) return [];
    const result: string[] = [];
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);

    let hour = openH;
    let minute = openM;
    while (hour < closeH || (hour === closeH && minute < closeM)) {
      result.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      minute += step;
      if (minute >= 60) { minute = 0; hour++; }
    }

    return result;
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
      await this.appointmentService.addAppointment(bookingData);
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

  private computeAvailableHoursForCurrentMatrix() {
    this.availableHoursByDate = {};
    for (const week of this.calendarMatrix) {
      for (const d of week) {
        if (!d) continue;
        const dateKey = this.formatDate(d);
        const booked = this.bookedSlotsByDate[dateKey] || [];
        const hours = this.getAvailableHoursForDate(d, booked);
        this.availableHoursByDate[dateKey] = hours.map(h => h.value);
      }
    }
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