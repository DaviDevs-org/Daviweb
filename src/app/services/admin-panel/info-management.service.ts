import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    doc,
    getDoc,
    updateDoc} from '@angular/fire/firestore';

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
}

@Injectable({
    providedIn: 'root'
})
export class InfoManager {
    private firestore = inject(Firestore);
    private schedulePath = '/pruebas/data/info/schedule'
    private contactInfoPath = '/pruebas/data/info/contact-info'


    private defaultSchedule: ScheduleDay[] = [
        { name: 'Lunes', day: 'monday', open: '09:00', close: '19:00', closed: false },
        { name: 'Martes', day: 'tuesday', open: '09:00', close: '19:00', closed: false },
        { name: 'Miércoles', day: 'wednesday', open: '09:00', close: '19:00', closed: false },
        { name: 'Jueves', day: 'thursday', open: '09:00', close: '19:00', closed: false },
        { name: 'Viernes', day: 'friday', open: '09:00', close: '20:00', closed: false },
        { name: 'Sábado', day: 'saturday', open: '09:00', close: '18:00', closed: true },
        { name: 'Domingo', day: 'sunday', open: '10:00', close: '14:00', closed: true }
    ];

    private defaultContactInfo: ContactInfo = {
        phone: '+34 123 456 789',
        email: 'info@peluqueriamoderna.com',
        address: 'Calle Principal, 123\n28001 Madrid, España'
    };

    
    async getSchedule(): Promise<ScheduleDay[]> {
        try {
            const placeRef = doc(this.firestore, this.schedulePath);
            const docSnapshot = await getDoc(placeRef);

            const data = docSnapshot.data();
            return  data!['schedule'] || this.defaultSchedule

        } catch (error) {
            console.error('Error getting schedule:', error);
            throw error;
        }
    }

    async getContactInfo(): Promise<ContactInfo> {
        try {
            const placeRef = doc(this.firestore, this.contactInfoPath);
            const docSnapshot = await getDoc(placeRef);

            const data = docSnapshot.data();
            return  data!['contactInfo'] || this.defaultContactInfo

        } catch (error) {
            console.error('Error getting contact info:', error);
            throw error;
        }
    }

    async saveSchedule(schedule: ScheduleDay[]): Promise<void> {
        try {
            const businessDoc = doc(this.firestore, this.schedulePath);
            await updateDoc(businessDoc, {
                schedule: schedule,
            });
        } catch (error) {
            console.error('Error saving schedule:', error);
            throw error;
        }
    }

    async saveContactInfo(contactInfo: ContactInfo): Promise<void> {
        try {
            const businessDoc = doc(this.firestore, this.contactInfoPath);
            await updateDoc(businessDoc, {
                contactInfo: contactInfo,
            });
        } catch (error) {
            console.error('Error saving contact info:', error);
            throw error;
        }
    }

    async isBusinessOpen(): Promise<BusinessStatus> {
        try {
            const businessInfo = await this.getSchedule();
            const now = new Date();

            return this.calculateBusinessStatus(businessInfo, now);
        } catch (error) {
            console.error('Error checking business status:', error);
            return {
                isOpen: false,
                currentDay: this.getDayName(new Date().getDay())
            };
        }
    }

    private calculateBusinessStatus(schedule: ScheduleDay[], checkDate: Date): BusinessStatus {
        const dayIndex = checkDate.getDay();
        const currentTime = checkDate.getHours().toString().padStart(2, '0') + ':' +
            checkDate.getMinutes().toString().padStart(2, '0');

        // Mapear índice de día a nombre de día en el schedule
        const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const currentDayKey = dayMap[dayIndex];

        const today = schedule.find(day => day.day === currentDayKey);

        if (!today) {
            return {
                isOpen: false,
                currentDay: this.getDayName(dayIndex)
            };
        }

        const status: BusinessStatus = {
            isOpen: false,
            currentDay: today.name,
            openTime: today.open,
            closeTime: today.close
        };

        if (today.closed) {
            // Buscar el próximo día que esté abierto
            const nextOpen = this.findNextOpenDay(schedule, dayIndex);
            status.nextOpenDay = nextOpen.day;
            status.nextOpenTime = nextOpen.time;
            status.timeUntilChange = this.calculateTimeUntil(checkDate, nextOpen.date);
        } else {
            // El negocio no está cerrado todo el día, verificar horario
            if (currentTime >= today.open && currentTime < today.close) {
                status.isOpen = true;
                // Calcular tiempo hasta el cierre
                const closeDateTime = this.createDateTimeFromTime(checkDate, today.close);
                status.timeUntilChange = this.calculateTimeUntil(checkDate, closeDateTime);
            } else {
                // Está fuera del horario de hoy
                if (currentTime < today.open) {
                    // Antes de abrir hoy
                    status.nextOpenTime = today.open;
                    status.nextOpenDay = today.name;
                    const openDateTime = this.createDateTimeFromTime(checkDate, today.open);
                    status.timeUntilChange = this.calculateTimeUntil(checkDate, openDateTime);
                } else {
                    // Después del cierre de hoy, buscar próxima apertura
                    const nextOpen = this.findNextOpenDay(schedule, dayIndex);
                    status.nextOpenDay = nextOpen.day;
                    status.nextOpenTime = nextOpen.time;
                    status.timeUntilChange = this.calculateTimeUntil(checkDate, nextOpen.date);
                }
            }
        }

        return status;
    }

    /**
     * Encuentra el próximo día que el negocio estará abierto
     */
    private findNextOpenDay(schedule: ScheduleDay[], currentDayIndex: number): { day: string, time: string, date: Date } {
        const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const now = new Date();

        for (let i = 1; i <= 7; i++) {
            const nextDayIndex = (currentDayIndex + i) % 7;
            const nextDayKey = dayMap[nextDayIndex];
            const nextDay = schedule.find(day => day.day === nextDayKey);

            if (nextDay && !nextDay.closed) {
                const nextDate = new Date(now);
                nextDate.setDate(nextDate.getDate() + i);
                const openDateTime = this.createDateTimeFromTime(nextDate, nextDay.open);

                return {
                    day: nextDay.name,
                    time: nextDay.open,
                    date: openDateTime
                };
            }
        }

        // Fallback - debería nunca llegar aquí si hay al menos un día abierto
        return {
            day: 'Lunes',
            time: '09:00',
            date: new Date()
        };
    }

    /**
     * Crea un objeto Date combinando una fecha con una hora en formato HH:mm
     */
    private createDateTimeFromTime(date: Date, timeString: string): Date {
        const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
        const result = new Date(date);
        result.setHours(hours, minutes, 0, 0);
        return result;
    }

    /**
     * Calcula el tiempo hasta una fecha específica
     */
    private calculateTimeUntil(from: Date, to: Date): string {
        const diffMs = to.getTime() - from.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes < 60) {
            return `${diffMinutes} minutos`;
        } else if (diffMinutes < 1440) { // menos de 24 horas
            const hours = Math.floor(diffMinutes / 60);
            const minutes = diffMinutes % 60;
            return `${hours}h ${minutes}m`;
        } else {
            const days = Math.floor(diffMinutes / 1440);
            const hours = Math.floor((diffMinutes % 1440) / 60);
            return `${days}d ${hours}h`;
        }
    }

    /**
     * Obtiene el nombre del día basado en el índice
     */
    private getDayName(dayIndex: number): string {
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[dayIndex];
    }

    /**
     * Valida si un horario es válido
     */
    validateSchedule(schedule: ScheduleDay[]): { isValid: boolean, errors: string[] } {
        const errors: string[] = [];

        for (const day of schedule) {
            if (!day.closed) {
                if (!day.open || !day.close) {
                    errors.push(`Completa los horarios para ${day.name}`);
                    continue;
                }

                if (day.open >= day.close) {
                    errors.push(`La hora de apertura debe ser anterior a la de cierre para ${day.name}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Valida la información de contacto
     */
    validateContactInfo(contactInfo: ContactInfo): { isValid: boolean, errors: string[] } {
        const errors: string[] = [];

        if (!contactInfo.phone?.trim()) {
            errors.push('El teléfono es requerido');
        }

        if (!contactInfo.email?.trim()) {
            errors.push('El email es requerido');
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(contactInfo.email)) {
                errors.push('El email no tiene un formato válido');
            }
        }

        if (!contactInfo.address?.trim()) {
            errors.push('La dirección es requerida');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}