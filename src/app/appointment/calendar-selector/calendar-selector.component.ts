import { Component, EventEmitter, Output } from '@angular/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-calendar-selector',
  templateUrl: './calendar-selector.component.html',
  imports: [
    NgForOf,
    FormsModule,
    NgIf,
    NgClass
  ],
  styleUrls: ['./calendar-selector.component.scss']
})
export class CalendarSelectorComponent {

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

  constructor() {
    const startYear = this.selectedYear - 10;
    const endYear = this.selectedYear + 10;
    for(let y = startYear; y <= endYear; y++) {
      this.years.push(y);
    }
    this.generateCalendar();
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

    // Ajustar el primer día para que la semana empiece en lunes
    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 7 : startDay; // Domingo = 0, ponlo a 7

    let currentDay = 1 - (startDay - 1); // Día para empezar la matriz

    while (currentDay <= lastDayOfMonth.getDate()) {
      const week: (Date | null)[] = [];
      for(let i = 0; i < 7; i++) {
        if (currentDay > 0 && currentDay <= lastDayOfMonth.getDate()) {
          week.push(new Date(this.selectedYear, this.selectedMonth, currentDay));
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

  isAvailable(date: Date | null): boolean {
    // Aquí puedes meter tu lógica para deshabilitar fechas
    // Por ejemplo, no permitir días pasados
    if (!date) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return date >= today;
  }

  selectDate(date: Date | null) {
    if (!date || !this.isAvailable(date)) return;
    this.selectedDate = date;
    this.dateSelected.emit(date);
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

}
