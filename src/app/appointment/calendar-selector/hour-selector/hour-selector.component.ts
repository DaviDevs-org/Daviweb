import { Component, Input, Output, EventEmitter } from '@angular/core';
import {DatePipe, NgForOf} from '@angular/common';

@Component({
  selector: 'app-hour-selector',
  templateUrl: './hour-selector.component.html',
  imports: [
    DatePipe,
    NgForOf
  ],
  styleUrls: ['./hour-selector.component.scss']
})
export class HourSelectorComponent {

  @Input() date: Date | null = null;
  @Output() back = new EventEmitter<void>();

  hours: string[] = [];

  selectedHour: string | null = null;

  constructor() {
    this.generateHours();
  }

  generateHours() {
    // Horas de 9:00 a 21:00 cada 30 minutos
    this.hours = [];
    for(let h = 9; h <= 21; h++) {
      this.hours.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 21) this.hours.push(`${h.toString().padStart(2, '0')}:30`);
    }
  }

  selectHour(hour: string) {
    this.selectedHour = hour;
  }

  confirm() {
    if (this.selectedHour && this.date != null) {
      alert(`Has seleccionado ${this.date.toLocaleDateString()} a las ${this.selectedHour}`);
    }
  }


  goBack() {
    this.back.emit();
  }

}
