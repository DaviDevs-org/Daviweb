import { Injectable, inject, signal, computed, runInInjectionContext, Injector } from '@angular/core';
import { GetContactInfoUseCase, GetScheduleUseCase } from '@application/business';
import { ScheduleService } from '@shared/pipes/schedule.service';
import { ContactInfo, ScheduleDay } from '@domain/business-info';

@Injectable({
    providedIn: 'root'
})
export class BusinessStateService {

    private injector = inject(Injector);
    private getInfo = inject(GetContactInfoUseCase);
    private getSchedule = inject(GetScheduleUseCase);
    private scheduleService = inject(ScheduleService);

    // Estado para la información de contacto
    // Inicializamos con valores por defecto para evitar "undefined" en la UI
    readonly contactInfo = signal<ContactInfo>(new ContactInfo("Cargando dirección...", "Cargando email...", "Cargando teléfono..."));

    // Estado para el horario crudo (tal cual viene de la BBDD)
    readonly rawSchedule = signal<ScheduleDay[]>([]);


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
    }

    // --- ACTIONS ---

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
}