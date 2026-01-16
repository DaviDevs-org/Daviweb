import { Component, input, output, signal, linkedSignal, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BarberDTO, ScheduleDayDTO } from '@domain/index';
import { ScheduleEditorComponent } from '../../shared/schedule-editor/schedule-editor.component';
import { BusinessStateService } from '@presentation/shared/business-state.service';

@Component({
  selector: 'app-barber-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ScheduleEditorComponent],
  templateUrl: './barber-edit-modal.component.html',
  styleUrls: ['./barber-edit-modal.component.scss']
})
export class BarberEditModalComponent implements OnInit, OnDestroy {
  private businessState = inject(BusinessStateService);

  // Inputs
  public barber = input.required<BarberDTO>();

  // Outputs
  public close = output<void>();
  public save = output<BarberDTO>();

  // State
  public activeTab = signal<'general' | 'schedule'>('general');
  
  public localBarber = linkedSignal(() => {
    // Deep copy
    return JSON.parse(JSON.stringify(this.barber()));
  });

  public hasCustomSchedule = linkedSignal(() => {
    return !!this.localBarber().schedule && this.localBarber().schedule!.length > 0;
  });

  ngOnInit() {
    // Bloquear scroll del body cuando se abre el modal
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    // Restaurar scroll del body cuando se cierra el modal
    document.body.style.overflow = '';
  }

  // Actions
  onClose() {
    this.close.emit();
  }

  onSave() {
    this.save.emit(this.localBarber());
  }

  enableCustomSchedule() {
    // Initialize with a copy of the business schedule
    // We need to fetch current business schedule
    // Since we are in presentation, we can use BusinessStateService or pass it as input.
    // Let's use BusinessStateService for convenience.
    
    // Note: BusinessStateService returns entities or DTOs? 
    // It returns entities usually, let's check.
    const rawSchedule = this.businessState.rawSchedule();
    const scheduleDTOs = rawSchedule.map(d => d.toDTO());
    
    const current = this.localBarber();
    current.schedule = JSON.parse(JSON.stringify(scheduleDTOs));
    this.localBarber.set({...current});
  }

  disableCustomSchedule() {
    const current = this.localBarber();
    current.schedule = undefined; // Set to undefined to inherit global
    this.localBarber.set({...current});
  }

  onScheduleChange(newSchedule: ScheduleDayDTO[]) {
    const current = this.localBarber();
    current.schedule = newSchedule;
    this.localBarber.set({...current}); // Trigger update? LinkedSignal handles it?
    // Actually linkedSignal updates when dependency changes. Here we modify local value.
  }
}
