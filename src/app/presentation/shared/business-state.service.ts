import { Injectable, inject, signal, computed, runInInjectionContext, Injector, NgZone } from '@angular/core';
import { GetContactInfoUseCase, GetScheduleUseCase } from '@application/business';
import { ScheduleService } from '@presentation/shared/pipes/schedule.service';
import { ContactInfo, ScheduleDay } from '@domain/business-info';
import { BusinessStatus } from '@domain/business-info/business-status.types';

@Injectable({
    providedIn: 'root'
})
export class BusinessStateService {

    private injector = inject(Injector);
    private ngZone = inject(NgZone); // Inyectamos NgZone
    private getInfo = inject(GetContactInfoUseCase);
    private getSchedule = inject(GetScheduleUseCase);
    private scheduleService = inject(ScheduleService);

    // Estado para la información de contacto
    // Inicializamos con valores por defecto para evitar "undefined" en la UI
    readonly contactInfo = signal<ContactInfo>(new ContactInfo("000000000", "loading@loading.com", "Cargando información..."));

    // Estado para el horario crudo (tal cual viene de la BBDD)
    readonly rawSchedule = signal<ScheduleDay[]>([]);

    // Señal optimizada: El timer corre fuera de Angular para no disparar detecciones globales innecesarias
    readonly currentTime = signal(new Date());

    // Estado calculado del negocio (Abierto/Cerrado, Próxima apertura, etc.)
    readonly businessStatus = computed(() => {
        const schedule = this.rawSchedule();
        const now = this.currentTime(); // Dependencia reactiva del tiempo

        if (!schedule || schedule.length === 0) {
            return {
                isOpen: false,
                currentDay: '',
                isWarning: false,
                remainingMinutes: 0
            } as BusinessStatus;
        }
        return this.calculateBusinessStatus(schedule, now);
    });

    // Esta señal se recalcula automáticamente cuando cambia 'rawSchedule'.
    // Contiene la lógica de transformación que antes tenías en el Footer.
    readonly formattedSchedule = computed(() => {
        const schedule = this.rawSchedule();

        if (!schedule || schedule.length === 0) {
            return ["Cargando horario..."];
        }
        const formattedText = this.scheduleService.formatScheduleText(schedule);
        return this.scheduleService.splitScheduleText(formattedText);
    });

    constructor() {
        this.loadInitialData();
        this.startClock();
    }

    // --- ACTIONS ---

    private startClock() {
        // Ejecutamos el intervalo fuera de Angular para que NO dispare la detección de cambios global cada minuto.
        // Solo cuando actualizamos la señal 'currentTime', Angular detectará el cambio localmente en los componentes afectados.
        this.ngZone.runOutsideAngular(() => {
            setInterval(() => {
                this.currentTime.set(new Date());
            }, 60000);
        });
    }

    private loadInitialData() {
        runInInjectionContext(this.injector, async () => {
            try {
                // 1. Cargar Info de Contacto
                const infoResponse = await this.getInfo.execute();
                infoResponse.subscribe(info => {
                    this.contactInfo.set(info);
                });

                // 2. Cargar Horario
                const scheduleResponse = await this.getSchedule.execute();
                scheduleResponse.subscribe(schedule => {
                    this.rawSchedule.set(schedule);
                });

            } catch (error) {
                console.error('Error inicializando BusinessStateService:', error);
                this.contactInfo.set(new ContactInfo("Error cargando dirección", "Error cargando email", "Error cargando teléfono"));
                this.rawSchedule.set([]);
            }
        }
        );
    }

    // --- HELPER METHODS FOR BUSINESS STATUS ---

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
}