import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Firestore, doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove } from '@angular/fire/firestore';
import {
  ContactInfo,
  ScheduleDay,
  Interval,
  Barber,
  BarberSettings,
  ExceptionItem
} from '../../admin-panel/types/admin.types';

export interface BusinessStatus {
  isOpen: boolean;
  currentDay: string;
  openTime?: string;
  closeTime?: string;
  nextOpenDay?: string;
  nextOpenTime?: string;
  timeUntilChange?: string;
  isWarning?: boolean;
  warningType?: 'closing' | 'opening';
  remainingMinutes?: number;
  remainingSeconds?: number;
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
  private barberPath = '/pruebas/data/barber-settings/barbers';

  private defaultSchedule: ScheduleDay[] = [
    { name: 'Lunes', day: 'lunes', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
    { name: 'Martes', day: 'martes', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
    { name: 'Miércoles', day: 'miércoles', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
    { name: 'Jueves', day: 'jueves', intervals: [{ open: '09:00', close: '19:00' }], closed: false },
    { name: 'Viernes', day: 'viernes', intervals: [{ open: '09:00', close: '20:00' }], closed: false },
    { name: 'Sábado', day: 'sábado', intervals: [{ open: '09:00', close: '18:00' }], closed: true },
    { name: 'Domingo', day: 'domingo', intervals: [{ open: '10:00', close: '14:00' }], closed: true }
  ];

  private defaultContactInfo: ContactInfo = {
    phone: '+34 123 456 789',
    email: 'info@peluqueriamoderna.com',
    address: 'Calle Principal, 123\n28001 Madrid, España'
  };


  /** ==================== SCHEDULE / CONTACT ==================== */

  async getSchedule(): Promise<ScheduleDay[]> {
    try {
      return await runInInjectionContext(this.injector, async () => {
        const placeRef = doc(this.firestore, this.schedulePath);
        const snap = await getDoc(placeRef);
        const data = snap.data() as Partial<{ schedule: ScheduleDay[] }> | undefined;
        return data?.schedule ?? this.defaultSchedule;
      });
    } catch (err) {
      console.error('Error getting schedule:', err);
      return this.defaultSchedule;
    }
  }

  async saveSchedule(schedule: ScheduleDay[]): Promise<void> {
    try {
      await runInInjectionContext(this.injector, async () => {
        const ref = doc(this.firestore, this.schedulePath);
        try {
          await updateDoc(ref, { schedule });
        } catch {
          await setDoc(ref, { schedule }, { merge: true });
        }
      });
    } catch (err) {
      console.error('Error saving schedule:', err);
      throw err;
    }
  }

  async getContactInfo(): Promise<ContactInfo> {
    try {
      return await runInInjectionContext(this.injector, async () => {
        const placeRef = doc(this.firestore, this.contactInfoPath);
        const snap = await getDoc(placeRef);
        const data = snap.data() as Partial<{ contactInfo: ContactInfo }> | undefined;
        return data?.contactInfo ?? this.defaultContactInfo;
      });
    } catch (err) {
      console.error('Error getting contact info:', err);
      return this.defaultContactInfo;
    }
  }

  async saveContactInfo(contactInfo: ContactInfo): Promise<void> {
    try {
      await runInInjectionContext(this.injector, async () => {
        const ref = doc(this.firestore, this.contactInfoPath);
        try {
          await updateDoc(ref, { contactInfo });
        } catch {
          await setDoc(ref, { contactInfo }, { merge: true });
        }
      });
    } catch (err) {
      console.error('Error saving contact info:', err);
      throw err;
    }
  }

  /** ==================== BUSINESS STATUS ==================== */
  async isBusinessOpen(): Promise<BusinessStatus> {
    const schedule = await this.getSchedule();
    const now = new Date();
    return this.calculateBusinessStatus(schedule, now);
  }

  private calculateBusinessStatus(schedule: ScheduleDay[], checkDate: Date): BusinessStatus {
    const dayMap = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dayIndex = checkDate.getDay();
    const currentTime = `${String(checkDate.getHours()).padStart(2, '0')}:${String(checkDate.getMinutes()).padStart(2, '0')}`;
    const today = schedule.find(d => d.day === dayMap[dayIndex]);

    const status: BusinessStatus = {
      isOpen: false,
      currentDay: today?.name ?? dayMap[dayIndex],
      isWarning: false,
      remainingMinutes: 0
    };

    if (!today || today.closed || today.intervals.length === 0) {
      const next = this.findNextOpenDay(schedule, dayIndex);
      status.nextOpenDay = next.day;
      status.nextOpenTime = next.time;
      status.timeUntilChange = this.diffTimeString(checkDate, next.date);

      const diffMinutes = Math.floor((next.date.getTime() - checkDate.getTime()) / 60000);
      if (diffMinutes > 0 && diffMinutes <= 60) {
        status.isWarning = true;
        status.warningType = 'opening';
        status.remainingMinutes = diffMinutes;
        status.remainingSeconds = diffMinutes * 60;
      }
      return status;
    }

    for (const interval of today.intervals) {
      if (currentTime >= interval.open && currentTime < interval.close) {
        status.isOpen = true;
        status.openTime = interval.open;
        status.closeTime = interval.close;

        const closeDt = this.createDateTimeFromTime(checkDate, interval.close);
        const diffMinutes = Math.floor((closeDt.getTime() - checkDate.getTime()) / 60000);
        if (diffMinutes <= 60) {
          status.isWarning = true;
          status.warningType = 'closing';
          status.remainingMinutes = diffMinutes;
          status.remainingSeconds = diffMinutes * 60;
        }
        return status;
      }
    }

    const nextInterval = today.intervals.find(i => currentTime < i.open);
    if (nextInterval) {
      const openDt = this.createDateTimeFromTime(checkDate, nextInterval.open);
      const diffMinutes = Math.floor((openDt.getTime() - checkDate.getTime()) / 60000);
      if (diffMinutes <= 60) {
        status.isWarning = true;
        status.warningType = 'opening';
        status.remainingMinutes = diffMinutes;
        status.remainingSeconds = diffMinutes * 60;
      }
      status.nextOpenDay = today.name;
      status.nextOpenTime = nextInterval.open;
      status.timeUntilChange = this.diffTimeString(checkDate, openDt);
      return status;
    }

    const next = this.findNextOpenDay(schedule, dayIndex);
    status.nextOpenDay = next.day;
    status.nextOpenTime = next.time;
    status.timeUntilChange = this.diffTimeString(checkDate, next.date);
    const diffMinutes = Math.floor((next.date.getTime() - checkDate.getTime()) / 60000);
    if (diffMinutes <= 60) {
      status.isWarning = true;
      status.warningType = 'opening';
      status.remainingMinutes = diffMinutes;
      status.remainingSeconds = diffMinutes * 60;
    }

    return status;
  }

  private findNextOpenDay(schedule: ScheduleDay[], currentDayIndex: number) {
    const dayMap = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const now = new Date();

    for (let i = 1; i <= 7; i++) {
      const idx = (currentDayIndex + i) % 7;
      const dayKey = dayMap[idx];
      const day = schedule.find(d => d.day === dayKey);
      if (day && !day.closed && day.intervals.length > 0) {
        const nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + i);
        const openDate = this.createDateTimeFromTime(nextDate, day.intervals[0].open);
        return { day: day.name, time: day.intervals[0].open, date: openDate };
      }
    }

    return { day: 'Lunes', time: '09:00', date: new Date() };
  }

  private createDateTimeFromTime(date: Date, time: string): Date {
    const [h, m] = time.split(':').map(Number);
    const dt = new Date(date);
    dt.setHours(h, m, 0, 0);
    return dt;
  }

  private diffTimeString(from: Date, to: Date): string {
    const diff = to.getTime() - from.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} minutos`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }



  async getExceptions(): Promise<ExceptionItem[]> {
    try {
      return await runInInjectionContext(this.injector, async () => {
        const ref = doc(this.firestore, this.availabilityPath);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          return []; // Array vacío por defecto
        }

        const data = snap.data() as any;

        return data.exceptions || [];
      });
    } catch (err) {
      console.error('Error getting exceptions:', err);
      return [];
    }
  }

  async saveExceptions(exceptions: ExceptionItem[]): Promise<void> {
    try {
      await runInInjectionContext(this.injector, async () => {
        const ref = doc(this.firestore, this.availabilityPath);
        await setDoc(ref, { exceptions }); // Guardar array directo
      });
    } catch (err) {
      console.error('Error saving exceptions:', err);
      throw err;
    }
  }

  /** ==================== BARBERS ==================== */

  async getBarberSettings(): Promise<BarberSettings> {
    try {
      const ref = doc(this.firestore, this.barberPath);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const defaultSettings: BarberSettings = { settings: { barberSelection: false, staff: [] } } as any;
        await setDoc(ref, defaultSettings);
        return defaultSettings;
      }
      const data = snap.data() as any;

      if (data && (data.barberSelection !== undefined || data.staff !== undefined)) {
        return { settings: { barberSelection: !!data.barberSelection, staff: data.staff ?? [] } } as any;
      }

      return data as BarberSettings;
    } catch (err) {
      console.error('Error getting barber settings:', err);
      return { settings: { barberSelection: false, staff: [] } } as any;
    }
  }

  async saveBarberSettings(settings: { barberSelection: boolean; staff: Barber[] }): Promise<void> {
    try {
      const ref = doc(this.firestore, this.barberPath);
      try {
        await updateDoc(ref, { settings });
      } catch {
        await setDoc(ref, { settings }, { merge: true });
      }
    } catch (err) {
      console.error('Error saving barber settings:', err);
      throw err;
    }
  }

  async updateBarberSelection(value: boolean): Promise<void> {
    try {
      const ref = doc(this.firestore, this.barberPath);
      await updateDoc(ref, { 'settings.barberSelection': value });
    } catch (err) {
      console.error('Error updating barber selection:', err);
    }
  }

  async addBarber(barber: Barber): Promise<void> {
    try {
      const ref = doc(this.firestore, this.barberPath);
      await updateDoc(ref, { 'settings.staff': arrayUnion(barber) });
    } catch (err) {
      console.error('Error adding barber:', err);
    }
  }

  async removeBarber(barber: Barber): Promise<void> {
    try {
      const ref = doc(this.firestore, this.barberPath);
      await updateDoc(ref, { 'settings.staff': arrayRemove(barber) });
    } catch (err) {
      console.error('Error removing barber:', err);
    }
  }

  async editBarber(oldBarber: Barber, newBarber: Barber): Promise<void> {
    try {
      const ref = doc(this.firestore, this.barberPath);
      await updateDoc(ref, { 'settings.staff': arrayRemove(oldBarber) });
      await updateDoc(ref, { 'settings.staff': arrayUnion(newBarber) });
    } catch (err) {
      console.error('Error editing barber:', err);
    }
  }
}
