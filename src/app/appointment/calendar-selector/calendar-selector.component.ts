// src/app/admin/calendar-selector/calendar-selector.component.ts
import { Component, EventEmitter, Output, OnDestroy } from '@angular/core';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HourSelectorComponent } from './hour-selector/hour-selector.component';
import { BookingFormComponent } from './booking-form/booking-form.component';
import { ReservedSlotsService, ReservedSlot } from '../../services/reserved-slots.service';
import { AppointmentService } from '../../services/appointments.service';
import {lastValueFrom, Subject, takeUntil} from 'rxjs';
import {InfoManager} from '../../services/admin-panel/info-management.service';

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

  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

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

  availableHoursForSelectedDate: string[] = [];
  availableHoursByDate: Record<string, string[]> = {};
  bookedSlotsByDate: Record<string, string[]> = {};
  availabilityData: any = null;

  private destroy$ = new Subject<void>();

  constructor(
    private reservedSlotsService: ReservedSlotsService,
    private appointmentService: AppointmentService,
    private infoManager: InfoManager
  ) {
    const startYear = this.selectedYear - 10;
    const endYear = this.selectedYear + 10;
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
      const availability = await this.infoManager.getAvailability();
      const slots = await this.reservedSlotsService.getReservedSlotsFromNow().toPromise();

      this.availabilityData = availability;

      this.bookedSlotsByDate = {};
      (slots ?? []).forEach((slot: ReservedSlot) => {
        if (!this.bookedSlotsByDate[slot.date]) this.bookedSlotsByDate[slot.date] = [];
        this.bookedSlotsByDate[slot.date].push(slot.time);
      });

      this.computeAvailableHoursForCurrentMatrix();
    } catch (error) {
      console.error('Error cargando availability o reservas:', error);
    }
  }

  togglePicker() { this.showPicker = !this.showPicker; }

  onDateChange() {
    this.showPicker = false;
    this.generateCalendar();
    this.computeAvailableHoursForCurrentMatrix();
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
        } else {
          week.push(null);
        }
        currentDay++;
      }
      this.calendarMatrix.push(week);
    }
    this.computeAvailableHoursForCurrentMatrix();
  }

  isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate();
  }

  isSelected(date: Date | null): boolean {
    if (!date || !this.selectedDate) return false;
    return date.getTime() === this.selectedDate.getTime();
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
    const available = this.availableHoursByDate[dateKey];
    return available ? available.length > 0 : true;
  }

  selectDate(date: Date | null) {
    if (!date) return;
    const dateKey = this.formatDate(date);
    const bookedHours = this.bookedSlotsByDate[dateKey] || [];

    const hours = this.getAvailableHoursForDate(date, bookedHours);

    if (!hours || hours.length === 0) {
      alert('No hay horas disponibles para este día');
      return;
    }

    this.availableHoursForSelectedDate = hours;
    this.selectedDate = date;
    this.dateSelected.emit(date);
    this.showHours = true;
    this.showForm = false;
  }

  /** Calcula horas disponibles para una fecha usando availabilityData y bookedSlotsByDate */
  private getAvailableHoursForDate(date: Date, booked: string[]): string[] {
    if (!this.availabilityData) return [];

    const dateKey = this.formatDate(date);
    const ex = this.availabilityData.exceptions?.[dateKey];

    let hours: string[] = [];

    if (ex) {
      if (!ex.closed && Array.isArray(ex.hours) && ex.hours.length) {
        hours = ex.hours.slice();
      } // si está cerrado, queda hours = []
    } else {
      const dayName = this.getDayName(date); // 'lunes', 'martes', ...
      const ds = this.availabilityData.defaultSchedule?.[dayName];
      if (ds && !ds.closed) {
        hours = this.hoursRangeFromOpenClose(ds.open, ds.close);
      }
    }

    // Filtrar las horas ya reservadas
    return hours.filter(h => !booked.includes(h));
  }

  /** Crea array de horas tipo ['09:00','10:00',...] entre open y close */
  private hoursRangeFromOpenClose(open: string, close: string): string[] {
    const result: string[] = [];
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);

    let hour = openH;
    let minute = openM;

    while (hour < closeH || (hour === closeH && minute < closeM)) {
      result.push(`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
      minute += 60; // puedes cambiar a 30 si quieres medias horas
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
      this.loadData(); // recarga reservas y disponibilidad
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
        this.availableHoursByDate[dateKey] = hours;
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
