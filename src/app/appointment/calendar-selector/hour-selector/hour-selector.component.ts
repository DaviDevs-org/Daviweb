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
  @Output() back = new EventEmitter<void>();
  @Output() hourSelected = new EventEmitter<string>(); // <-- añadimos evento para la hora

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

  selectHour(hour: string) {
    this.selectedHour = hour;
  }

  confirm() {
    if (this.selectedHour) {
      this.hourSelected.emit(this.selectedHour);
    }
  }

  confirmDirect(hour: string) {
    this.selectedHour = hour;
    this.hourSelected.emit(this.selectedHour);
  }

  goBack() {
    this.back.emit();
  }
}
