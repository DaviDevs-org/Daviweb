import { Component, EventEmitter, Output, OnDestroy } from '@angular/core';
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HourSelectorComponent } from './hour-selector/hour-selector.component';
import { BookingFormComponent } from './booking-form/booking-form.component';
import { ReservedSlotsService, ReservedSlot } from '../../services/reserved-slots.service';
import { AppointmentService } from '../../services/appointments.service';
import { Subject, takeUntil } from 'rxjs';

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

  allPossibleHours = [
    '09:00','09:30','10:00','10:30','11:00','11:30',
    '12:00','12:30','13:00','13:30','14:00','14:30',
    '15:00','15:30','16:00','16:30','17:00','17:30',
    '18:00','18:30','19:00','19:30','20:00','20:30','21:00'
  ];

  bookedSlotsByDate: Record<string, string[]> = {};

  private destroy$ = new Subject<void>();

  constructor(
    private reservedSlotsService: ReservedSlotsService,
    private appointmentService: AppointmentService
  ) {
    const startYear = this.selectedYear - 10;
    const endYear = this.selectedYear + 10;
    for (let y = startYear; y <= endYear; y++) {
      this.years.push(y);
    }
    this.generateCalendar();
    this.loadBookedSlots();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  togglePicker() {
    this.showPicker = !this.showPicker;
  }

  onDateChange() {
    this.showPicker = false;
    this.generateCalendar();
  }

  generateCalendar() {
    this.calendarMatrix = [];

    const firstDayOfMonth = new Date(this.selectedYear, this.selectedMonth, 1);
    const lastDayOfMonth = new Date(this.selectedYear, this.selectedMonth + 1, 0);

    // Ajuste para lunes = 0, domingo = 6
    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 7 : startDay; // Domingo pasa a 7 para contar bien
    let currentDay = 1 - (startDay - 1);

    while (currentDay <= lastDayOfMonth.getDate()) {
      const week: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (currentDay > 0 && currentDay <= lastDayOfMonth.getDate()) {
          const date = new Date(this.selectedYear, this.selectedMonth, currentDay);
          week.push(date);
        } else {
          week.push(null);
        }
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
    if (!date || !this.selectedDate) return false;
    return date.getTime() === this.selectedDate.getTime();
  }

  isDayFullyBooked(date: Date): boolean {
    const dateKey = this.formatDate(date);
    const bookedHours = this.bookedSlotsByDate[dateKey] || [];
    return this.allPossibleHours.every(hour => bookedHours.includes(hour));
  }

  isAvailable(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;

    return !this.isDayFullyBooked(date);
  }

  selectDate(date: Date | null) {
    if (!date || !this.isAvailable(date)) return;
    this.selectedDate = date;
    this.dateSelected.emit(date);
    this.showHours = true;
    this.showForm = false;
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

  async handleFormSubmit(data: { name: string; email: string; phone: string; description?: string }) {
    console.log('[CalendarSelector] handleFormSubmit recibido:', data);

    if (!this.selectedDate || !this.selectedHour) {
      alert('Error: Fecha u hora no seleccionada');
      return;
    }

    if (this.isSubmitting) {
      return; // evita reentradas
    }

    const bookingData = {
      date: this.selectedDateString,
      time: this.selectedHour,
      ...data
    };

    console.log('handleFormSubmit recibido:', bookingData);

    this.isSubmitting = true;
    try {
      const result = await this.appointmentService.addAppointment(bookingData);
      console.log('Resultado addAppointment:', result);
      alert('Cita guardada correctamente 👌');
      this.resetAll();
      // recarga slots después de que se confirme el guardado
      this.loadBookedSlots();
    } catch (error: any) {
      console.error('Error guardando la cita:', error);
      alert('Error al guardar la cita: ' + (error.message || JSON.stringify(error)));
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
    if (!this.selectedDate) return '';
    return this.formatDate(this.selectedDate);
  }

  loadBookedSlots() {
    // Nos suscribimos a los reservedSlots desde hoy en adelante
    this.reservedSlotsService.getReservedSlotsFromNow()
      .pipe(takeUntil(this.destroy$))
      .subscribe((slots: ReservedSlot[]) => {
        this.bookedSlotsByDate = {};

        slots.forEach(slot => {
          const date = slot.date; // asumiendo YYYY-MM-DD guardado como string
          const time = slot.time;

          if (!this.bookedSlotsByDate[date]) {
            this.bookedSlotsByDate[date] = [];
          }
          this.bookedSlotsByDate[date].push(time);
        });

        this.generateCalendar();
      }, err => {
        console.error('Error cargando reservedSlots:', err);
      });
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
