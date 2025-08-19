import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import {NgForOf, DatePipe, NgIf} from '@angular/common';

@Component({
  selector: 'app-hour-selector',
  templateUrl: './hour-selector.component.html',
  imports: [DatePipe, NgForOf, NgIf],
  styleUrls: ['./hour-selector.component.scss']
})
export class HourSelectorComponent implements OnChanges {

  @Input() date: Date | null = null;
  @Input() bookedHours: string[] = [];
  @Input() availableHours: string[] = [];
  @Output() back = new EventEmitter<void>();
  @Output() hourSelected = new EventEmitter<string>();

  hours: string[] = [];
  selectedHour: string | null = null;

  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['availableHours'] || changes['date']) {
      this.generateHours();
    }
  }

  generateHours() {
    const available = this['availableHours'] as string[]; // <-- acceso seguro
    const booked = this['bookedHours'] as string[];
    const date = this['date'] as Date | null;

    if (!available || available.length === 0 || !date) {
      this.hours = [];
      return;
    }

    const now = new Date();
    this.hours = available.filter(hour => {
      if (booked.includes(hour)) return false;

      const [hourStr, minStr] = hour.split(':').map(Number);

      if (date.toDateString() === now.toDateString()) {
        if (hourStr < now.getHours()) return false;
        if (hourStr === now.getHours() && minStr <= now.getMinutes()) return false;
      }

      return true;
    });

    if (this.selectedHour && !this.hours.includes(this.selectedHour)) {
      this.selectedHour = null;
    }
  }

  selectHour(hour: string) {
    if (this.hours.includes(hour)) this.selectedHour = hour;
  }

  confirm() {
    if (this.selectedHour) this.hourSelected.emit(this.selectedHour);
  }

  confirmDirect(hour: string) {
    if (this.hours.includes(hour)) {
      this.selectedHour = hour;
      this.hourSelected.emit(this.selectedHour);
    }
  }

  goBack() { this.back.emit(); }
}
