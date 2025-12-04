import { Component } from '@angular/core';
import { CalendarSelectorComponent } from './calendar-selector/calendar-selector.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-appointment',
  standalone: true,
  imports: [CalendarSelectorComponent, CommonModule],
  templateUrl: './appointment.component.html',
  styleUrls: ['./appointment.component.scss']
})
export class AppointmentComponent {
  // Logic moved to CalendarSelectorComponent
}
