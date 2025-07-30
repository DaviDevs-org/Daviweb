import { Component, EventEmitter, Output } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-calendar-selector',
  standalone: true,
  imports: [MatDatepickerModule, MatNativeDateModule],
  templateUrl: './calendar-selector.component.html',
  styleUrls: ['./calendar-selector.component.scss']
})
export class CalendarSelectorComponent {
  selectedDate: Date | null = null;

  @Output() daySelected = new EventEmitter<Date>();

  excludedDays: string[] = [
    // Pon aquí los días que quieras excluir manualmente (en formato ISO)
    // Ejemplo: '2025-08-04'
  ];

  isWeekday(date: Date): boolean {
    const day = date.getDay();
    // 1 = lunes ... 5 = viernes
    return day >= 1 && day <= 5;
  }

  isDateInPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // quitamos la hora para comparar sólo fecha
    return date < today;
  }

  getAvailableDays = (date: Date): string => {
    const dateString = date.toISOString().split('T')[0];

    if (this.isDateInPast(date)) return 'day-unavailable';

    if (!this.isWeekday(date)) return 'day-unavailable';

    if (this.excludedDays.includes(dateString)) return 'day-unavailable';

    return 'day-available';
  };


  onDaySelected(date: Date | null) {
    if (date) {
      this.selectedDate = date;
      this.daySelected.emit(date);
    }
  }
}
