import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  setDoc
} from '@angular/fire/firestore';

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

export interface BusinessInfo {
  schedule: ScheduleDay[];
  contactInfo: ContactInfo;
}

export interface BusinessStatus {
  isOpen: boolean;
  currentDay: string;
  openTime?: string;
  closeTime?: string;
  nextOpenTime?: string;
  nextOpenDay?: string;
  timeUntilChange?: string;
  isWarning?: boolean; // Nuevo: indica si falta una hora o menos
  warningType?: 'closing' | 'opening'; // Nuevo: tipo de advertencia
  remainingMinutes?: number; // Nuevo: minutos exactos restantes
  remainingSeconds?: number
}

export interface AvailabilityException {
  closed: boolean;
  hours?: string[];
}

export interface AvailabilityData {
  defaultSchedule: Record<string, { open: string; close: string; closed: boolean }>;
  exceptions: Record<string, AvailabilityException>;
}

@Injectable({
  providedIn: 'root'
})
export class InfoManager {
  private firestore = inject(Firestore);
  private injector = inject(Injector);

  private schedulePath = '/pruebas/data/info/schedule';
  private contactInfoPath = '/pruebas/data/info/contact-info';
  private availabilityPath = '/pruebas/data/availability/config';

  private defaultSchedule: ScheduleDay[] = [
    { name: 'Lunes', day: 'lunes', open: '09:00', close: '19:00', closed: false },
    { name: 'Martes', day: 'martes', open: '09:00', close: '19:00', closed: false },
    { name: 'Miércoles', day: 'miércoles', open: '09:00', close: '19:00', closed: false },
    { name: 'Jueves', day: 'jueves', open: '09:00', close: '19:00', closed: false },
    { name: 'Viernes', day: 'viernes', open: '09:00', close: '20:00', closed: false },
    { name: 'Sábado', day: 'sábado', open: '09:00', close: '18:00', closed: true },
    { name: 'Domingo', day: 'domingo', open: '10:00', close: '14:00', closed: true }
  ];

  private defaultContactInfo: ContactInfo = {
    phone: '+34 123 456 789',
    email: 'info@peluqueriamoderna.com',
    address: 'Calle Principal, 123\n28001 Madrid, España'
  };

  private _availabilityData: AvailabilityData | null = null;

  /** Obtiene el documento de schedule */
  async getSchedule(): Promise<ScheduleDay[]> {
    try {
      return await runInInjectionContext(this.injector, async () => {
        const placeRef = doc(this.firestore, this.schedulePath);
        const docSnapshot = await getDoc(placeRef);
        const data = docSnapshot.data() as Partial<BusinessInfo> | undefined;
        return data?.schedule ?? this.defaultSchedule;
      });
    } catch (error) {
      console.error('Error getting schedule:', error);
      throw error;
    }
  }

  /** Obtiene contactInfo */
  async getContactInfo(): Promise<ContactInfo> {
    try {
      return await runInInjectionContext(this.injector, async () => {
        const placeRef = doc(this.firestore, this.contactInfoPath);
        const docSnapshot = await getDoc(placeRef);
        const data = docSnapshot.data() as Partial<BusinessInfo> | undefined;
        return data?.contactInfo ?? this.defaultContactInfo;
      });
    } catch (error) {
      console.error('Error getting contact info:', error);
      throw error;
    }
  }

  /** Guarda schedule (update) */
  async saveSchedule(schedule: ScheduleDay[]): Promise<void> {
    try {
      await runInInjectionContext(this.injector, async () => {
        const businessDoc = doc(this.firestore, this.schedulePath);
        await updateDoc(businessDoc, { schedule });
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  }

  /** Guarda contactInfo (update) */
  async saveContactInfo(contactInfo: ContactInfo): Promise<void> {
    try {
      await runInInjectionContext(this.injector, async () => {
        const businessDoc = doc(this.firestore, this.contactInfoPath);
        await updateDoc(businessDoc, { contactInfo });
      });
    } catch (error) {
      console.error('Error saving contact info:', error);
      throw error;
    }
  }

  /** Comprueba si el negocio está abierto */
  async isBusinessOpen(): Promise<BusinessStatus> {
    try {
      const businessInfo = await this.getSchedule();
      const now = new Date();
      return this.calculateBusinessStatus(businessInfo, now);
    } catch (error) {
      console.error('Error checking business status:', error);
      return {
        isOpen: false,
        currentDay: this.getDayName(new Date().getDay()),
        isWarning: false,
        remainingMinutes: 0
      };
    }
  }

  private calculateBusinessStatus(schedule: ScheduleDay[], checkDate: Date): BusinessStatus {
    const dayIndex = checkDate.getDay();
    const currentTime = checkDate.getHours().toString().padStart(2, '0') + ':' +
      checkDate.getMinutes().toString().padStart(2, '0');

    const dayMap = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const currentDayKey = dayMap[dayIndex];
    const today = schedule.find(day => day.day === currentDayKey);

    if (!today) {
      return { 
        isOpen: false, 
        currentDay: this.getDayName(dayIndex),
        isWarning: false,
        remainingMinutes: 0
      };
    }

    const status: BusinessStatus = {
      isOpen: false,
      currentDay: today.name,
      openTime: today.open,
      closeTime: today.close,
      isWarning: false,
      remainingMinutes: 0
    };

    if (today.closed) {
      const nextOpen = this.findNextOpenDay(schedule, dayIndex);
      status.nextOpenDay = nextOpen.day;
      status.nextOpenTime = nextOpen.time;
      status.timeUntilChange = this.calculateTimeUntil(checkDate, nextOpen.date);
      
      // Verificar si falta una hora o menos para abrir mañana
      const diffMinutes = Math.floor((nextOpen.date.getTime() - checkDate.getTime()) / 60000);
      if (diffMinutes <= 60 && diffMinutes > 0) {
        status.isWarning = true;
        status.warningType = 'opening';
        status.remainingMinutes = diffMinutes;
      }
    } else {
      if (currentTime >= today.open && currentTime < today.close) {
        status.isOpen = true;
        const closeDateTime = this.createDateTimeFromTime(checkDate, today.close);
        status.timeUntilChange = this.calculateTimeUntil(checkDate, closeDateTime);
        
        // Verificar si falta una hora o menos para cerrar
        const diffMinutes = Math.floor((closeDateTime.getTime() - checkDate.getTime()) / 60000);
        if (diffMinutes <= 60 && diffMinutes > 0) {
          status.isWarning = true;
          status.warningType = 'closing';
          status.remainingMinutes = diffMinutes;
        }
      } else {
        if (currentTime < today.open) {
          status.nextOpenTime = today.open;
          status.nextOpenDay = today.name;
          const openDateTime = this.createDateTimeFromTime(checkDate, today.open);
          status.timeUntilChange = this.calculateTimeUntil(checkDate, openDateTime);
          
          // Verificar si falta una hora o menos para abrir hoy
          const diffMinutes = Math.floor((openDateTime.getTime() - checkDate.getTime()) / 60000);
          if (diffMinutes <= 60 && diffMinutes > 0) {
            status.isWarning = true;
            status.warningType = 'opening';
            status.remainingMinutes = diffMinutes;
          }
        } else {
          const nextOpen = this.findNextOpenDay(schedule, dayIndex);
          status.nextOpenDay = nextOpen.day;
          status.nextOpenTime = nextOpen.time;
          status.timeUntilChange = this.calculateTimeUntil(checkDate, nextOpen.date);
          
          // Verificar si falta una hora o menos para abrir mañana
          const diffMinutes = Math.floor((nextOpen.date.getTime() - checkDate.getTime()) / 60000);
          if (diffMinutes <= 60 && diffMinutes > 0) {
            status.isWarning = true;
            status.warningType = 'opening';
            status.remainingMinutes = diffMinutes;
          }
        }
      }
    }

    return status;
  }

  private findNextOpenDay(schedule: ScheduleDay[], currentDayIndex: number): { day: string, time: string, date: Date } {
    const dayMap = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const now = new Date();

    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (currentDayIndex + i) % 7;
      const nextDayKey = dayMap[nextDayIndex];
      const nextDay = schedule.find(day => day.day === nextDayKey);

      if (nextDay && !nextDay.closed) {
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + i);
        const openDateTime = this.createDateTimeFromTime(nextDate, nextDay.open);

        return { day: nextDay.name, time: nextDay.open, date: openDateTime };
      }
    }

    return { day: 'Lunes', time: '09:00', date: new Date() };
  }

  private createDateTimeFromTime(date: Date, timeString: string): Date {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private calculateTimeUntil(from: Date, to: Date): string {
    const diffMs = to.getTime() - from.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 60) return `${diffMinutes} minutos`;
    else if (diffMinutes < 1440) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
    } else {
      const days = Math.floor(diffMinutes / 1440);
      const hours = Math.floor((diffMinutes % 1440) / 60);
      return `${days}d ${hours}h`;
    }
  }

  private getDayName(dayIndex: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayIndex];
  }

  validateSchedule(schedule: ScheduleDay[]): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];
    for (const day of schedule) {
      if (!day.closed) {
        if (!day.open || !day.close) errors.push(`Completa los horarios para ${day.name}`);
        else if (day.open >= day.close) errors.push(`La hora de apertura debe ser anterior a la de cierre para ${day.name}`);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  validateContactInfo(contactInfo: ContactInfo): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];
    if (!contactInfo.phone?.trim()) errors.push('El teléfono es requerido');
    if (!contactInfo.email?.trim()) errors.push('El email es requerido');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactInfo.email)) errors.push('El email no tiene un formato válido');
    if (!contactInfo.address?.trim()) errors.push('La dirección es requerida');
    return { isValid: errors.length === 0, errors };
  }

  private defaultScheduleMap(): Record<string, { open: string; close: string; closed: boolean }> {
    const map: Record<string, { open: string; close: string; closed: boolean }> = {};
    for (const d of this.defaultSchedule) {
      map[d.day.toLowerCase()] = { open: d.open || '', close: d.close || '', closed: !!d.closed };
    }
    return map;
  }

  async getAvailability(): Promise<AvailabilityData> {
    if (this._availabilityData) return this._availabilityData;
    try {
      return await runInInjectionContext(this.injector, async () => {
        const ref = doc(this.firestore, this.availabilityPath);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          this._availabilityData = { defaultSchedule: this.defaultScheduleMap(), exceptions: {} };
          return this._availabilityData;
        }
        this._availabilityData = snap.data() as AvailabilityData;
        return this._availabilityData;
      });
    } catch (error) {
      console.error('Error getting availability:', error);
      throw error;
    }
  }

  async saveAvailability(availability: AvailabilityData): Promise<void> {
    try {
      await runInInjectionContext(this.injector, async () => {
        const ref = doc(this.firestore, this.availabilityPath);
        await setDoc(ref, availability, { merge: true });
        this._availabilityData = availability;
      });
    } catch (error) {
      console.error('Error saving availability:', error);
      throw error;
    }
  }

  hoursRangeFromOpenClose(open: string, close: string, stepMinutes = 30): string[] {
    const hours: string[] = [];
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);

    let current = new Date();
    current.setHours(openH, openM, 0, 0);
    const end = new Date();
    end.setHours(closeH, closeM, 0, 0);

    while (current < end) {
      const hh = String(current.getHours()).padStart(2,'0');
      const mm = String(current.getMinutes()).padStart(2,'0');
      hours.push(`${hh}:${mm}`);
      current.setMinutes(current.getMinutes() + stepMinutes);
    }
    return hours;
  }

  getAvailableHoursForDate(date: Date, bookedHours: string[]): string[] {
    if (!this._availabilityData) return [];

    const dateKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const ex = this._availabilityData.exceptions?.[dateKey];
    let hours: string[] = [];

    if (ex) {
      if (ex.closed) {
        hours = [];
      } else if (Array.isArray(ex.hours) && ex.hours.length) {
        hours = ex.hours.slice();
      } else {
        const ds = this._availabilityData.defaultSchedule[this.getDayKey(date)];
        if (ds && !ds.closed) hours = this.hoursRangeFromOpenClose(ds.open, ds.close);
      }
    } else {
      const ds = this._availabilityData.defaultSchedule[this.getDayKey(date)];
      if (ds && !ds.closed) hours = this.hoursRangeFromOpenClose(ds.open, ds.close);
    }

    return hours.filter(h => !bookedHours.includes(h));
  }

  private getDayKey(date: Date): string {
    return ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][date.getDay()];
  }

  validateAvailability(data: AvailabilityData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const ds = data?.defaultSchedule;
    const days = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];

    if (!ds) errors.push('Falta defaultSchedule.');
    else {
      for (const day of days) {
        const cfg = ds[day];
        if (!cfg) errors.push(`Falta configuración para ${day}`);
        else if (!cfg.closed) {
          if (!cfg.open || !cfg.close) errors.push(`Horas no definidas para ${day}`);
          else if (cfg.open >= cfg.close) errors.push(`Apertura >= cierre en ${day}`);
          else {
            if (!/^\d{2}:\d{2}$/.test(cfg.open)) errors.push(`Formato inválido open en ${day}: ${cfg.open}`);
            if (!/^\d{2}:\d{2}$/.test(cfg.close)) errors.push(`Formato inválido close en ${day}: ${cfg.close}`);
          }
        }
      }
    }

    const ex = data?.exceptions || {};
    for (const key of Object.keys(ex)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) errors.push(`Fecha de excepción inválida: ${key}`);
      const item = ex[key];
      if (item) {
        if (typeof item.closed !== 'boolean') errors.push(`El campo 'closed' debe ser boolean en ${key}`);
        if (Array.isArray(item.hours)) {
          for (const h of item.hours) {
            if (!/^\d{2}:\d{2}$/.test(h)) errors.push(`Hora inválida en ${key}: ${h}`);
          }
        } else if (item.hours !== undefined && item.hours !== null) {
          errors.push(`'hours' debe ser un array para ${key}`);
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}