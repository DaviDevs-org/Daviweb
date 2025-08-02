import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InfoManager } from '../../../services/admin-panel/info-management.service';

@Component({
  selector: 'app-info-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./info-management.component.html",
  styleUrls: ['./info-management.component.scss']
})
export class InfoManagementComponent implements OnInit {
  schedule: any[] = [];
  contactInfo: any = {};
  isLoading = true;

  constructor(private infoManager: InfoManager) {}

  async ngOnInit() {
    try {
      this.schedule = await this.infoManager.getSchedule();
      this.contactInfo = await this.infoManager.getContactInfo();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async saveSchedule(): Promise<void> {
    try {
      const validation = this.infoManager.validateSchedule(this.schedule);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }

      await this.infoManager.saveSchedule(this.schedule);
      alert('Horarios guardados correctamente!');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error al guardar los horarios');
    }
  }

  async saveContactInfo(): Promise<void> {
    try {
      const validation = this.infoManager.validateContactInfo(this.contactInfo);
      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }

      await this.infoManager.saveContactInfo(this.contactInfo);
      alert('Información de contacto guardada correctamente!');
    } catch (error) {
      console.error('Error saving contact info:', error);
      alert('Error al guardar la información de contacto');
    }
  }

  validateTime(day: any): void {
    if (!day.closed && day.open && day.close && day.open >= day.close) {
      alert(`La hora de apertura debe ser anterior a la de cierre para ${day.name}.`);
      day.close = '';
    }
  }

  getDayStatus(day: any): string {
    if (day.closed) return 'Cerrado';
    return `${day.open} - ${day.close}`;
  }
}