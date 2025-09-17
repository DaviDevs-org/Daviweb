import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ContactInfo,
  ScheduleDay,
  Interval,
  AvailabilityData,
  ExceptionItem,
  BarberSettings,
  Barber
} from '../../types/admin.types';
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

  // Mantengo compatibilidad: barberSettings contiene tanto la forma anidada en .settings
  // como propiedades top-level barberSelection/staff para que la plantilla actual funcione.
  barberSettings: any = { settings: { barberSelection: false, staff: [] }, barberSelection: false, staff: [] };

  isBarberLoading = true;
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

    await this.loadBarberSettings();
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

  async removeException(i: number) {
    if(!confirm('¿Seguro que desea eliminar esta excepción?')) return;

    const backup = [...this.exceptions];
    this.exceptions.splice(i,1);

    try {
      await this.saveAvailability(false);
    } catch (err) {
      console.error('Error eliminando excepción en servidor', err);
      this.exceptions = backup;
      alert('❌ Error al eliminar la excepción en el servidor. Se ha restaurado el estado anterior.');
    }
  }

  onExceptionToggleClosed(ex: ExceptionItem) {
    if(ex.closed) ex.intervals=[];
    else if(!ex.intervals.length) ex.intervals.push({open:'',close:''});
    void this.saveAvailability(false);
  }

  addExInterval(ex: ExceptionItem) {
    ex.intervals.push({open:'',close:''});
    void this.saveAvailability(false);
  }

  removeExInterval(ex: ExceptionItem, i: number) {
    ex.intervals.splice(i,1);
    void this.saveAvailability(false);
  }

  validateExInterval(ex: ExceptionItem, interval: Interval) {
    if(!ex.closed && interval.open && interval.close && interval.open >= interval.close) interval.close='';
    void this.saveAvailability(false);
  }

  onExceptionDateChange(ex: ExceptionItem) {
    if(ex.date && !/^\d{4}-\d{2}-\d{2}$/.test(ex.date)) {
      alert('Formato de fecha inválido. Use YYYY-MM-DD.');
      return;
    }
    if (ex.date) void this.saveAvailability(false);
  }

  transformExceptionsToObject(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const ex of this.exceptions) {
      if(!ex.date) continue;
      out[ex.date] = ex.closed ? { closed:true, hours: [] } : { closed:false, hours: ex.intervals.map(i => `${i.open}-${i.close}`) };
    }
    return out;
  }

  // ===== GUARDADO =====
  async saveAvailability(showAlert: boolean = true): Promise<void> {
    try {
      const payload: AvailabilityData = {
        defaultSchedule: this.transformScheduleToDefault(),
        exceptions: this.transformExceptionsToObject()
      };
      await this.infoManager.saveAvailability(payload);
      if (showAlert) alert('✅ Disponibilidad guardada correctamente!');
    } catch (err) {
      console.error(err);
      if (showAlert) alert('❌ Error al guardar la disponibilidad');
      else throw err;
    }
  }

  async saveContactInfo(): Promise<void> {
    try {
      await this.infoManager.saveContactInfo(this.contactInfo);
      alert('Información de contacto guardada correctamente!');
    } catch(err){ console.error(err); alert('Error al guardar la información de contacto'); }
  }

  getDayStatus(day: ScheduleDay): string { if(day.closed) return 'Cerrado'; return day.intervals.map(i=>`${i.open}-${i.close}`).join(', '); }

  // ===== BARBER SETTINGS =====

  async loadBarberSettings() {
    this.isBarberLoading = true;
    try {
      const settings = await this.infoManager.getBarberSettings();

      // settings puede venir en forma anidada o legacy plano; unificamos en this.barberSettings
      if ((settings as any).settings) {
        // anidado
        this.barberSettings.settings = settings.settings;
        // también mantenemos propiedades top-level para compatibilidad con la plantilla actual
        this.barberSettings.barberSelection = settings.settings.barberSelection;
        this.barberSettings.staff = settings.settings.staff;
      } else {
        // legacy plano
        const legacy = settings as any;
        this.barberSettings.settings = { barberSelection: !!legacy.barberSelection, staff: legacy.staff ?? [] };
        this.barberSettings.barberSelection = this.barberSettings.settings.barberSelection;
        this.barberSettings.staff = this.barberSettings.settings.staff;
      }
    } catch (err) {
      console.error('Error cargando peluqueros', err);
      this.barberSettings = { settings: { barberSelection: false, staff: [] }, barberSelection: false, staff: [] };
    } finally {
      this.isBarberLoading = false;
    }
  }

  // Guardar configuración completa (botón "Guardar configuración")
  async saveBarberSettings() {
    try {
      // Persistimos la forma anidada (service espera settings object)
      const settingsPayload = {
        barberSelection: !!this.barberSettings.settings.barberSelection,
        staff: this.barberSettings.settings.staff ?? []
      };
      await this.infoManager.saveBarberSettings(settingsPayload);

      // mantenemos sincronía top-level para la UI
      this.barberSettings.barberSelection = settingsPayload.barberSelection;
      this.barberSettings.staff = settingsPayload.staff;

      alert('✅ Configuración de peluqueros guardada correctamente!');
    } catch (err) {
      console.error(err);
      alert('❌ Error al guardar la configuración de peluqueros');
    }
  }

  // Toggle inmediato (opcional). También actualiza la forma plana para la plantilla.
  async toggleBarberSelection() {
    try {
      const newVal = !!this.barberSettings.settings.barberSelection;
      await this.infoManager.updateBarberSelection(newVal);
      this.barberSettings.barberSelection = newVal; // sincronizar top-level
    } catch (err) {
      console.error(err);
    }
  }

  async addBarber(name: string) {
    const n = name?.trim();
    if (!n) return;
    const newBarber: Barber = { id: crypto.randomUUID(), name: n, visible: true };
    try {
      await this.infoManager.addBarber(newBarber);
      this.barberSettings.settings.staff.push(newBarber);
    } catch (err) {
      console.error(err);
    }
  }



  async removeBarber(barber: Barber) {
    if (!confirm(`¿Seguro que quieres eliminar a ${barber.name}?`)) return;
    try {
      await this.infoManager.removeBarber(barber);
      this.barberSettings.settings.staff = this.barberSettings.settings.staff.filter((b: Barber) => b.id !== barber.id);
      this.barberSettings.staff = this.barberSettings.staff.filter((b: Barber) => b.id !== barber.id);
    } catch (err) {
      console.error(err);
    }
  }


  async onToggleBarberVisible(barber: Barber, newVisible: boolean) {
    const updatedBarber = { ...barber, visible: newVisible };
    try {
      await this.infoManager.editBarber(barber, updatedBarber);

      const idx = this.barberSettings.settings.staff.findIndex((b: Barber) => b.id === barber.id);
      if (idx !== -1) this.barberSettings.settings.staff[idx] = updatedBarber;

      const idx2 = this.barberSettings.staff.findIndex((b: Barber) => b.id === barber.id);
      if (idx2 !== -1) this.barberSettings.staff[idx2] = updatedBarber;
    } catch (err) {
      console.error('Error toggling barber visible', err);
      alert('❌ Error al cambiar visibilidad del peluquero');
    }
  }
}

