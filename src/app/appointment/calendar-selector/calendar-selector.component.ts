import { Component, EventEmitter, Output, OnDestroy } from '@angular/core';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HourSelectorComponent } from './hour-selector/hour-selector.component';
import { BookingFormComponent } from './booking-form/booking-form.component';
import { ReservedSlotsService, ReservedSlot } from '../../services/reserved-slots.service';
import { AppointmentService } from '../../services/appointments.service';
import { Subject, firstValueFrom } from 'rxjs';
import { InfoManager } from '../../services/admin-panel/info-management.service';
import { Barber } from '../../admin-panel/types/admin.types';
import { ChangeDetectorRef } from '@angular/core';

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

  @Output() dateSelected = new EventEmitter<Date>();

  monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  weekDays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

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
  availabilityData: any = null;

  barbers: Barber[] = [];
  allowBarberSelection = false;

  private destroy$ = new Subject<void>();

  constructor(
    private reservedSlotsService: ReservedSlotsService,
    private appointmentService: AppointmentService,
    private infoManager: InfoManager,
    private cdr: ChangeDetectorRef
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
      this.availabilityData = await this.infoManager.getAvailability();

      const slots = await firstValueFrom(this.reservedSlotsService.getReservedSlotsFromNow());
      this.bookedSlotsByDate = {};
      (slots ?? []).forEach((slot: ReservedSlot) => {
        const dateKey = slot.date;
        if (!this.bookedSlotsByDate[dateKey]) this.bookedSlotsByDate[dateKey] = [];
        this.bookedSlotsByDate[dateKey].push(slot.time);
      });

      await this.loadBarbers();
      this.computeAvailableHoursForCurrentMatrix();
    } catch (error) {
      console.error('Error cargando availability o reservas:', error);
    }
  }


  private async loadBarbers() {
    try {
      const settings = await this.infoManager.getBarberSettings();
      this.barbers = settings.settings.staff.filter(b => b.visible);
      this.allowBarberSelection = settings.settings.barberSelection;
      console.log('allowBarberSelection:', this.allowBarberSelection);
      console.log('[CalendarSelector] Barberos cargados:', this.barbers);

      this.cdr.detectChanges();
    } catch (err) {
      console.error('Error cargando barberos:', err);
      this.barbers = [];
    }
  }

  togglePicker() { this.showPicker = !this.showPicker; }
  onDateChange() { this.showPicker = false; this.generateCalendar(); }

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

  isDayFullyBooked(date: Date): boolean {
    const dateKey = this.formatDate(date);
    const available = this.availableHoursByDate[dateKey];
    return available ? available.length === 0 : false;
  }

  private getDayName(date: Date): string {
    const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
    return dias[date.getDay()];
  }

  isAvailable(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    if (date < today) return false;

    const dateKey = this.formatDate(date);
    const ex = this.availabilityData?.exceptions?.[dateKey];
    if (ex) return !ex.closed;

    const dayName = this.getDayName(date);
    const ds = this.availabilityData?.defaultSchedule?.[dayName];
    return !!(ds && !ds.closed);
  }

  selectDate(date: Date | null) {
    if (!date) return;
    const dateKey = this.formatDate(date);
    const bookedHours = this.bookedSlotsByDate[dateKey] || [];

    console.log('--- Seleccionando fecha ---');
    console.log('Fecha:', dateKey);
    console.log('Excepciones:', this.availabilityData?.exceptions?.[dateKey]);
    console.log('Reservas existentes:', bookedHours);

    const hoursWithStatus = this.getAvailableHoursForDate(date, bookedHours);
    console.log('Horas calculadas para este día:', hoursWithStatus);

    if (!hoursWithStatus.length) {
      alert('No hay horas disponibles para este día');
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
    const ex = this.availabilityData?.exceptions?.[dateKey];

    let hours: string[] = [];

    if (ex) {
      if (!ex.closed) {
        let intervals: { open: string; close: string }[] = [];
        if (Array.isArray(ex.intervals)) intervals = ex.intervals;
        else if (Array.isArray(ex.hours)) intervals = ex.hours.map((h: string) => {
          const [open, close] = h.split('-');
          return { open: open || '', close: close || '' };
        });

        intervals.forEach((interval: { open: string; close: string }) => {
          hours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    } else {
      const dayName = this.getDayName(date);
      const ds = this.availabilityData?.defaultSchedule?.[dayName];
      if (ds && !ds.closed && Array.isArray(ds.intervals)) {
        ds.intervals.forEach((interval: { open: string; close: string }) => {
          hours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    }

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
      result.push(`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
      minute += step;
      if (minute >= 60) { minute = 0; hour++; }
    }

    return result;
  }

  prevMonth() {
    if (this.selectedMonth === 0) { this.selectedMonth = 11; this.selectedYear--; }
    else this.selectedMonth--;
    this.onDateChange();
  }

  nextMonth() {
    if (this.selectedMonth === 11) { this.selectedMonth = 0; this.selectedYear++; }
    else this.selectedMonth++;
    this.onDateChange();
  }

  backToCalendar() { this.showHours = false; this.showForm = false; this.selectedDate = null; this.selectedHour = null; }
  onHourSelected(hour: string) { this.selectedHour = hour; this.showHours = false; this.showForm = true; }

  async handleFormSubmit(data: { name: string; email: string; phone: string; description?: string }) {
    if (!this.selectedDate || !this.selectedHour) { alert('Error: Fecha u hora no seleccionada'); return; }
    if (this.isSubmitting) return;

    const bookingData = { date: this.selectedDateString, time: this.selectedHour, ...data };
    this.isSubmitting = true;
    try {
      await this.appointmentService.addAppointment(bookingData);
      alert('Cita guardada correctamente 👌');
      this.resetAll();
      this.loadData();
    } catch (error: any) {
      console.error('Error guardando la cita:', error);
      alert('Error al guardar la cita: ' + (error.message || JSON.stringify(error)));
    } finally { this.isSubmitting = false; }
  }

  resetAll() { this.selectedDate = null; this.selectedHour = null; this.showForm = false; this.showHours = false; }
  get selectedDateString(): string { return this.selectedDate ? this.formatDate(this.selectedDate) : ''; }

  private computeAvailableHoursForCurrentMatrix() {
    this.availableHoursByDate = {};
    if (!this.availabilityData) return;
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

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth()+1).padStart(2,'0');
    const day = String(date.getDate()).padStart(2,'0');
    return `${year}-${month}-${day}`;
  }
}
