import { Component, Input, Output, EventEmitter } from '@angular/core';
import { DatePipe, NgForOf } from '@angular/common';

@Component({
  selector: 'app-hour-selector',
  templateUrl: './hour-selector.component.html',
  imports: [DatePipe, NgForOf],
  styleUrls: ['./hour-selector.component.scss']
})
export class HourSelectorComponent {

  @Input() date: Date | null = null;
  @Input() bookedHours: string[] = [];
  @Output() back = new EventEmitter<void>();
  @Output() hourSelected = new EventEmitter<string>();

  hours: string[] = [];
  selectedHour: string | null = null;

  constructor() {
    this.generateHours();
  }

  generateHours() {
    this.hours = [];
    for (let h = 9; h <= 21; h++) {
      this.hours.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 21) this.hours.push(`${h.toString().padStart(2, '0')}:30`);
    }
  }

  isHourAvailable(hour: string): boolean {
    if (!this.date) return false;

    if (this.bookedHours.includes(hour)) return false;

    const [hourStr, minStr] = hour.split(':');
    const now = new Date();
    return !(this.date.toDateString() === now.toDateString() &&
      (parseInt(hourStr) < now.getHours() ||
        (parseInt(hourStr) === now.getHours() && parseInt(minStr) <= now.getMinutes())));


  }

  selectHour(hour: string) {
    if (this.isHourAvailable(hour)) {
      this.selectedHour = hour;
    }
  }

  confirm() {
    if (this.selectedHour) {
      this.hourSelected.emit(this.selectedHour);
    }
  }

  confirmDirect(hour: string) {
    if (this.isHourAvailable(hour)) {
      this.selectedHour = hour;
      this.hourSelected.emit(this.selectedHour);
    }
  }

  goBack() {
    this.back.emit();
  }
}
