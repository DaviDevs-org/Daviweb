import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactInfo, ScheduleDay } from '../../types/admin.types';
import { InfoManager } from '../../../services/admin-panel/info-management.service';

type DaySchedule = ScheduleDay;
type ExceptionItem = { date: string | null; closed: boolean; hours: string[]; hoursText?: string };

@Component({
  selector: 'app-info-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./info-management.component.html",
  styleUrls: ['./info-management.component.scss']
})
export class InfoManagementComponent implements OnInit {
  schedule: DaySchedule[] = [];
  contactInfo: ContactInfo = { phone: '', email: '', address: '' };
  isLoading = true;

  exceptions: ExceptionItem[] = [];

  constructor(private infoManager: InfoManager) {}

  async ngOnInit() {
    try {
      // Carga horario semanal
      this.schedule = await this.infoManager.getSchedule();

      // Carga contacto
      this.contactInfo = await this.infoManager.getContactInfo();

      // Carga availability (defaultSchedule + exceptions)
      const availability = await this.infoManager.getAvailability();

      this.exceptions = this.mapExceptionsToArray(availability?.exceptions || {});

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Convierte el defaultSchedule de Firestore a `this.schedule`
  applyDefaultScheduleToLocal(defaultSchedule: Record<string, any>) {
    const dayOrder = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
    const names = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

    this.schedule = dayOrder.map((key, idx) => {
      const src = defaultSchedule[key] || {};
      return {
        day: key,
        name: names[idx],
        open: src.open || '',
        close: src.close || '',
        closed: !!src.closed
      } as DaySchedule;
    });
  }

  mapExceptionsToArray(obj: Record<string, any>): ExceptionItem[] {
    return Object.keys(obj).sort().map(dateKey => {
      const item = obj[dateKey];
      return {
        date: dateKey,
        closed: !!item.closed,
        hours: Array.isArray(item.hours) ? item.hours.slice() : [],
        hoursText: Array.isArray(item.hours) ? item.hours.join(',') : ''
      } as ExceptionItem;
    });
  }

  addEmptyException() {
    this.exceptions.push({ date: null, closed: true, hours: [], hoursText: '' });
  }

  removeException(index: number) {
    if (!confirm('¿Seguro que desea eliminar esta excepción?')) return;
    this.exceptions.splice(index, 1);
  }

  onExceptionToggleClosed(ex: ExceptionItem) {
    if (ex.closed) {
      ex.hours = [];
      ex.hoursText = '';
    }
  }

  syncHoursFromText(ex: ExceptionItem) {
    if (!ex.hoursText) {
      ex.hours = [];
      return;
    }
    ex.hours = ex.hoursText.split(',').map(s => s.trim()).filter(s => !!s);
  }

  onExceptionDateChange(ex: ExceptionItem) {
    if (ex.date && !/^\d{4}-\d{2}-\d{2}$/.test(ex.date)) {
      alert('Formato de fecha inválido. Use YYYY-MM-DD.');
    }
  }

  async saveAvailability(): Promise<void> {
    try {
      const payload = {
        defaultSchedule: this.transformScheduleToDefault(),
        exceptions: this.transformExceptionsToObject()
      };

      const validation = this.infoManager.validateAvailability(payload);

      if (!validation.isValid) {
        alert(validation.errors.join('\n'));
        return;
      }

      await this.infoManager.saveAvailability(payload);
      alert('Disponibilidad guardada correctamente!');
    } catch (error) {
      console.error('Error saving availability:', error);
      alert('Error al guardar la disponibilidad');
    }
  }

  transformScheduleToDefault(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const d of this.schedule) {
      out[d.day] = { open: d.open || '', close: d.close || '', closed: !!d.closed };
    }
    return out;
  }

  transformExceptionsToObject(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const ex of this.exceptions) {
      if (!ex.date) continue;
      out[ex.date] = { closed: !!ex.closed, hours: ex.hours || [] };
    }
    return out;
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

  validateTime(day: DaySchedule): void {
    if (!day.closed && day.open && day.close && day.open >= day.close) {
      alert(`La hora de apertura debe ser anterior a la de cierre para ${day.name}.`);
      day.close = '';
    }
  }

  getDayStatus(day: DaySchedule): string {
    if (day.closed) return 'Cerrado';
    return `${day.open} - ${day.close}`;
  }
}
