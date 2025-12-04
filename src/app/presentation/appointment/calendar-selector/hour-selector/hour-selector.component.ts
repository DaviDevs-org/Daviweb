import { Component, input, output, computed, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { TimeUtils } from '@domain/shared/utils/time.utils';

@Component({
  selector: 'app-hour-selector',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './hour-selector.component.html',
  styleUrls: ['./hour-selector.component.scss']
})
export class HourSelectorComponent {
  // Inputs
  public date = input.required<string | null>(); // ISO Date YYYY-MM-DD
  public availableHours = input<string[]>([]); // List of available time slots "HH:mm"

  // Outputs
  public back = output<void>();
  public hourSelected = output<string>();

  // State
  public selectedHour = signal<string | null>(null);

  // Computed
  public hours = computed(() => {
    const available = this.availableHours();
    const dateStr = this.date();
    
    if (!available || !dateStr) return [];

    const now = new Date();
    const todayStr = TimeUtils.toISODate(now);
    const isToday = dateStr === todayStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // We assume 'available' contains only slots that are theoretically open in the schedule
    // We just need to filter out past times if it's today, and map to object for the view
    return available.map(time => {
      let disabled = false;

      if (isToday) {
        const slotMinutes = TimeUtils.timeToMinutes(time);
        // Buffer of e.g. 30 mins or 0? Let's say strict past.
        if (slotMinutes <= currentMinutes) {
          disabled = true;
        }
      }

      return { value: time, disabled };
    }).sort((a, b) => a.value.localeCompare(b.value));
  });

  selectHour(hour: { value: string, disabled: boolean }) {
    if (!hour.disabled) {
      this.selectedHour.set(hour.value);
    }
  }

  confirm() {
    const current = this.selectedHour();
    if (current) {
      this.hourSelected.emit(current);
    }
  }

  confirmDirect(hour: { value: string, disabled: boolean }) {
    if (!hour.disabled) {
      this.selectedHour.set(hour.value);
      this.hourSelected.emit(hour.value);
    }
  }

  goBack() {
    this.back.emit();
  }
}
