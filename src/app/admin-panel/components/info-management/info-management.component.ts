import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactInfo, ScheduleDay, Interval, AvailabilityData, ExceptionItem } from '../../types/admin.types';
import { InfoManager } from '../../../services/admin-panel/info-management.service';

@Component({
  selector: 'app-info-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./info-management.component.html",
  styleUrls: ['./info-management.component.scss']
})
export class InfoManagementComponent implements OnInit {
  schedule: ScheduleDay[] = [];
  contactInfo: ContactInfo = { phone: '', email: '', address: '' };
  exceptions: ExceptionItem[] = [];
  isLoading = true;

  constructor(private infoManager: InfoManager) {}

  async ngOnInit() {
    try {
      this.contactInfo = await this.infoManager.getContactInfo();
      const availability = await this.infoManager.getAvailability();

      if (availability?.defaultSchedule) this.applyDefaultScheduleToLocal(availability.defaultSchedule);
      this.exceptions = this.mapExceptionsToArray(availability?.exceptions || {});
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // ===== HORARIOS SEMANALES =====
  applyDefaultScheduleToLocal(defaultSchedule: Record<string, any>) {
    const dayOrder = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
    const names = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

    this.schedule = dayOrder.map((key, idx) => {
      const src = defaultSchedule[key] || {};
      let intervals: Interval[] = [];
      if (Array.isArray(src.intervals) && src.intervals.length) intervals = src.intervals.map((i: any) => ({ open: i.open || '', close: i.close || '' }));

      return { day: key, name: names[idx], closed: !!src.closed, intervals } as ScheduleDay;
    });
  }

  addInterval(day: ScheduleDay) { day.intervals.push({ open: '', close: '' }); }
  removeInterval(day: ScheduleDay, i: number) { day.intervals.splice(i,1); }
  validateInterval(day: ScheduleDay, interval: Interval) {
    if (!day.closed && interval.open && interval.close && interval.open >= interval.close) interval.close = '';
  }
  onToggleDayClosed(day: ScheduleDay) { if(day.closed) day.intervals=[]; else if(!day.intervals.length) day.intervals.push({open:'',close:''}); }
  transformScheduleToDefault(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const d of this.schedule) out[d.day] = { closed: !!d.closed, intervals: d.intervals.map(i => ({ open: i.open, close: i.close })) };
    return out;
  }

  // ===== EXCEPCIONES POR FECHA =====
  mapExceptionsToArray(obj: Record<string, any>): ExceptionItem[] {
    return Object.keys(obj).sort().map(dateKey => {
      const item = obj[dateKey];
      let intervals: Interval[] = [];

      if (!item.closed && Array.isArray(item.hours) && item.hours.length) {
        intervals = item.hours.map((h: string) => {
          const [open, close] = h.split('-');
          return { open: open || '', close: close || '' };
        });
      }

      return { date: dateKey, closed: !!item.closed, intervals } as ExceptionItem;
    });
  }



  addEmptyException() { this.exceptions.push({ date: null, closed: false, intervals: [{ open:'', close:'' }] }); }
  removeException(i: number) { if(confirm('¿Seguro que desea eliminar esta excepción?')) this.exceptions.splice(i,1); }
  onExceptionToggleClosed(ex: ExceptionItem) { if(ex.closed) ex.intervals=[]; else if(!ex.intervals.length) ex.intervals.push({open:'',close:''}); }
  addExInterval(ex: ExceptionItem) { ex.intervals.push({open:'',close:''}); }
  removeExInterval(ex: ExceptionItem, i: number) { ex.intervals.splice(i,1); }
  validateExInterval(ex: ExceptionItem, interval: Interval) { if(!ex.closed && interval.open && interval.close && interval.open >= interval.close) interval.close=''; }
  onExceptionDateChange(ex: ExceptionItem) { if(ex.date && !/^\d{4}-\d{2}-\d{2}$/.test(ex.date)) alert('Formato de fecha inválido. Use YYYY-MM-DD.'); }

  transformExceptionsToObject(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const ex of this.exceptions) {
      if(!ex.date) continue;
      out[ex.date] = ex.closed ? { closed:true, hours: [] } : { closed:false, hours: ex.intervals.map(i => `${i.open}-${i.close}`) };
    }
    return out;
  }

  // ===== GUARDADO =====
  async saveAvailability(): Promise<void> {
    try {
      const payload: AvailabilityData = {
        defaultSchedule: this.transformScheduleToDefault(),
        exceptions: this.transformExceptionsToObject()
      };
      await this.infoManager.saveAvailability(payload);
      alert('✅ Disponibilidad guardada correctamente!');
    } catch (err) { console.error(err); alert('❌ Error al guardar la disponibilidad'); }
  }

  // ===== CONTACTO =====
  async saveContactInfo(): Promise<void> {
    try {
      await this.infoManager.saveContactInfo(this.contactInfo);
      alert('Información de contacto guardada correctamente!');
    }
    catch(err){ console.error(err); alert('Error al guardar la información de contacto'); }
  }

  getDayStatus(day: ScheduleDay): string { if(day.closed) return 'Cerrado'; return day.intervals.map(i=>`${i.open}-${i.close}`).join(', '); }
}
