import { Component } from '@angular/core';
import {CalendarSelectorComponent} from './calendar-selector/calendar-selector.component';
import {DatePipe, NgIf} from '@angular/common';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [
    CalendarSelectorComponent,
    DatePipe,
    NgIf
  ],
  templateUrl: './appointment.component.html',
  styleUrls: ['./appointment.component.scss']
})
export class AppointmentComponent {
  selectedDay: Date | null = null;

  onDaySelected(date: Date) {
    console.log('Día seleccionado desde el hijo:', date);
    this.selectedDay = date;
  }
}
