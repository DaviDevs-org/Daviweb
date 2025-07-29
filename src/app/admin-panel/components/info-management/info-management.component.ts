// info-management.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ScheduleDay {
  name: string;
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface ContactInfo {
  phone: string;
  email: string;
  address: string;
}

@Component({
  selector: 'app-info-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./info-management.component.html",
  styleUrls: ['./info-management.component.scss']
})
export class InfoManagementComponent {
  schedule: ScheduleDay[] = [
    { name: 'Lunes', day: 'monday', open: '09:00', close: '19:00', closed: false },
    { name: 'Martes', day: 'tuesday', open: '09:00', close: '19:00', closed: false },
    { name: 'Miércoles', day: 'wednesday', open: '09:00', close: '19:00', closed: false },
    { name: 'Jueves', day: 'thursday', open: '09:00', close: '19:00', closed: false },
    { name: 'Viernes', day: 'friday', open: '09:00', close: '20:00', closed: false },
    { name: 'Sábado', day: 'saturday', open: '09:00', close: '18:00', closed: false },
    { name: 'Domingo', day: 'sunday', open: '10:00', close: '14:00', closed: true }
  ];

  contactInfo: ContactInfo = {
    phone: '+34 123 456 789',
    email: 'info@peluqueriamoderna.com',
    address: 'Calle Principal, 123\n28001 Madrid, España'
  };

  saveSchedule(): void {
    for (const day of this.schedule) {
      if (!day.closed) {
        if (!day.open || !day.close) {
          alert(`Por favor, completa los horarios para ${day.name}.`);
          return;
        }

        if (day.open >= day.close) {
          alert(`La hora de apertura debe ser anterior a la de cierre para ${day.name}.`);
          return;
        }
      }
    }

    setTimeout(() => {
      alert('Horarios guardados correctamente!');
    }, 500);
  }

  saveContactInfo(): void {
    if (!this.contactInfo.phone.trim()) {
      alert('Por favor, ingresa un número de teléfono.');
      return;
    }

    if (!this.contactInfo.email.trim()) {
      alert('Por favor, ingresa un email.');
      return;
    }

    if (!this.contactInfo.address.trim()) {
      alert('Por favor, ingresa una dirección.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.contactInfo.email)) {
      alert('Por favor, ingresa un email válido.');
      return;
    }

    setTimeout(() => {
      alert('Información de contacto guardada correctamente!');
    }, 500);
  }

  validateTime(day: ScheduleDay): void {
    if (!day.closed && day.open && day.close && day.open >= day.close) {
      alert(`La hora de apertura debe ser anterior a la de cierre para ${day.name}.`);
      day.close = '';
    }
  }

  getDayStatus(day: ScheduleDay): string {
    if (day.closed) return 'Cerrado';
    return `${day.open} - ${day.close}`;
  }
}