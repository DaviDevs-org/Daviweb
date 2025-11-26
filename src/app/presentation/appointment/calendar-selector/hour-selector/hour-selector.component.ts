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
  @Input() availableHours: { value: string, disabled: boolean }[] = [];
  @Output() back = new EventEmitter<void>();
  @Output() hourSelected = new EventEmitter<string>();

  hours: { value: string, disabled: boolean }[] = [];
  selectedHour: string | null = null;

  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['availableHours'] || changes['date'] || changes['bookedHours']) {
      this.generateHours();
    }
  }

  generateHours() {
    if (!this.availableHours || !this.date) {
      this.hours = [];
      return;
    }

    const now = new Date();
    this.hours = this.availableHours.map(h => {
      let disabled = h.disabled;

      if (this.date && this.date.toDateString() === now.toDateString()) {
        const [hourStr, minStr] = h.value.split(':').map(Number);
        if (hourStr < now.getHours() || (hourStr === now.getHours() && minStr <= now.getMinutes())) {
          disabled = true;
        }
      }


      return { value: h.value, disabled };
    });

    if (this.selectedHour && !this.hours.some(h => h.value === this.selectedHour && !h.disabled)) {
      this.selectedHour = null;
    }
  }

  selectHour(hour: { value: string, disabled: boolean }) {
    if (!hour.disabled) this.selectedHour = hour.value;
  }

  confirm() {
    if (this.selectedHour) this.hourSelected.emit(this.selectedHour);
  }

  confirmDirect(hour: { value: string, disabled: boolean }) {
    if (!hour.disabled) {
      this.selectedHour = hour.value;
      this.hourSelected.emit(this.selectedHour);
    }
  }

  goBack() { this.back.emit(); }
}
