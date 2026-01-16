import { Component, input, output, linkedSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ScheduleDayDTO, IntervalDTO } from '@domain/index';

@Component({
  selector: 'app-schedule-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './schedule-editor.component.html',
  styleUrls: ['./schedule-editor.component.scss']
})
export class ScheduleEditorComponent {
  // Inputs
  public initialSchedule = input.required<ScheduleDayDTO[]>();
  public showSaveButton = input<boolean>(true);

  // Outputs
  public scheduleChange = output<ScheduleDayDTO[]>();
  public save = output<ScheduleDayDTO[]>();

  // State
  public schedule = linkedSignal(() => {
    // Deep copy to avoid mutating parent state directly until emit
    return JSON.parse(JSON.stringify(this.initialSchedule()));
  });

  // Helpers
  getScheduleRowClass(day: ScheduleDayDTO): string {
    return day.closed ? 'schedule-row closed-day' : 'schedule-row';
  }

  addInterval(day: ScheduleDayDTO) {
    if (day.closed) return;
    day.intervals.push({ open: '09:00', close: '14:00' });
    this.update();
  }

  removeInterval(day: ScheduleDayDTO, i: number) {
    day.intervals.splice(i, 1);
    this.update();
  }

  validateInterval(day: ScheduleDayDTO, interval: IntervalDTO) {
    if (
      !day.closed &&
      interval.open &&
      interval.close &&
      interval.open >= interval.close
    ) {
      interval.close = '';
      this.update();
    }
  }

  onToggleDayClosed(day: ScheduleDayDTO) {
    if (day.closed) {
      (day as any).backupIntervals = [...day.intervals];
      day.intervals = [];
    } else {
      if ((day as any).backupIntervals?.length) {
        day.intervals = [...(day as any).backupIntervals];
      } else if (!day.intervals.length) {
        day.intervals.push({ open: '09:00', close: '14:00' });
      }
      delete (day as any).backupIntervals;
    }
    this.update();
  }

  onSave() {
    this.save.emit(this.schedule());
  }

  private update() {
    this.schedule.set([...this.schedule()]); // Trigger update
    this.scheduleChange.emit(this.schedule());
  }
}
