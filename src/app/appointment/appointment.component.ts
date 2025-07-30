import { Component } from '@angular/core';
import { CalendarSelectorComponent } from './calendar-selector/calendar-selector.component';
import {DatePipe, NgIf} from '@angular/common';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CalendarSelectorComponent, NgIf, DatePipe],
  templateUrl: './appointment.component.html',
  styleUrls: ['./appointment.component.scss']
})
export class AppointmentComponent {
  selectedDate: Date | null = null;

  onDateSelected(date: Date) {
    this.selectedDate = date;
    console.log('Fecha recibida del hijo:', date);
  }
}
