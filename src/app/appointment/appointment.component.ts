import { Component } from '@angular/core';
import { CalendarSelectorComponent } from './calendar-selector/calendar-selector.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CalendarSelectorComponent, CommonModule], // Aquí solo CommonModule, que incluye NgIf y demás
  templateUrl: './appointment.component.html',
  styleUrls: ['./appointment.component.scss']
})
export class AppointmentComponent {
  selectedDate: Date | null = null;

  onDateSelected(date: Date) {
    this.selectedDate = date;
  }
}
