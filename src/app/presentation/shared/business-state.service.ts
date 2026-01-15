import {
  Injectable,
  inject,
  signal,
  computed,
  NgZone,
  afterNextRender,
} from '@angular/core';
import {
  GetContactInfoUseCase,
  GetScheduleUseCase,
  GetBarberSettingsUseCase,
} from '@application/business';
import { GetServicesUseCase } from '@application/services';
import { GetExceptionsUseCase } from '@application/business/schedule/exceptions/get-exceptions.use-case';
import { ScheduleService } from '@presentation/shared/pipes/schedule.service';
import {
  ContactInfo,
  ScheduleDay,
  ExceptionItem,
  ReservedSlot,
  BarberSettings,
} from '@domain/business-info';
import { Service } from '@domain/services';
import { BusinessStatus } from '@domain/business-info/business-status.types';
import { GetSlotsUseCase } from '@application/business/schedule/slots/get-slots.use-case';
import { GetAvailableSlotsForDayService } from '@domain/business-info/availability/get-available-slots-for-day.service';
import { Appointment, GalleryPhoto, PhotoType } from '@domain/index';
import { GetPhotosUseCase } from '@application/gallery';
import { GetAppointmentsUseCase } from '@application/appointments';

@Injectable({
  providedIn: 'root',
})
export class BusinessStateService {
  private ngZone = inject(NgZone); // Inyectamos NgZone
  private getInfo = inject(GetContactInfoUseCase);
  private getSchedule = inject(GetScheduleUseCase);
  private getServices = inject(GetServicesUseCase);
  private getExceptions = inject(GetExceptionsUseCase);
  private getBarberSettings = inject(GetBarberSettingsUseCase);
  private getReservedSlots = inject(GetSlotsUseCase);
  private scheduleService = inject(ScheduleService);
  private getImages = inject(GetPhotosUseCase);
  private getAppointments = inject(GetAppointmentsUseCase);

  // Available Slots
  private slotsService = inject(GetAvailableSlotsForDayService);

  // Estado para la información de contacto
  // Inicializamos con valores por defecto para evitar "undefined" en la UI
  readonly contactInfo = signal<ContactInfo>(
    new ContactInfo(
      '000000000',
      'loading@loading.com',
      'Cargando información...'
    )
  );

  // Estado para el horario crudo (tal cual viene de la BBDD)
  readonly rawSchedule = signal<ScheduleDay[]>([]);

  // Estado para los servicios ofrecidos
  readonly services = signal<Service[]>([]);

  // Estado para las citas
  readonly appointments = signal<Appointment[]>([]);

  // Estado para las excepciones de horario (días festivos, vacaciones)
  readonly exceptions = signal<ExceptionItem[]>([]);

  // Estado para la configuración de barberos
  readonly barberSettings = signal<BarberSettings | null>(null);

  // Estado para los slots reservados
  readonly reservedSlots = signal<ReservedSlot[]>([]);

  //Estado para las imágenes del carrousel
  readonly galleryImages = signal<GalleryPhoto[]>([]);

  // Señal optimizada: El timer corre fuera de Angular para no disparar detecciones globales innecesarias
  readonly currentTime = signal(new Date());

  // Estado calculado del negocio (Abierto/Cerrado, Próxima apertura, etc.)
  readonly businessStatus = computed(() => {
    const schedule = this.rawSchedule();
    const now = this.currentTime(); // Dependencia reactiva del tiempo
    const exceptions = this.exceptions(); // También dependemos de las excepciones

    if (!schedule || schedule.length === 0) {
      return {
        isOpen: false,
        currentDay: '',
        isWarning: false,
        remainingMinutes: 0,
      } as BusinessStatus;
    }
    // Pasamos las excepciones al cálculo del estado
    return this.calculateBusinessStatus(schedule, now, exceptions);
  });

  getAvailableSlotsForDate(date: Date, barberId?: string | null): string[] {
    const settings = this.barberSettings();
    const reservedSlots = this.reservedSlots();
    const exceptions = this.exceptions();
    const globalSchedule = this.rawSchedule();

    // 1. Modo Global (Legacy) o Barbero específico no seleccionado pero sistema desactivado
    if (!settings?.barberSelection) {
      return this.slotsService.execute(
        date,
        globalSchedule,
        exceptions,
        reservedSlots // Filtra slots globales (barberId=null) y específicos? No, en modo global todos bloquean?
        // En modo global, reservedSlots debería tener barberId=null.
        // Si hay slots con barberId, ¿deberían bloquear el global?
        // Asumimos que si barberSelection=false, operamos como antes.
      );
    }

    // 2. Modo Multi-Barbero
    if (barberId) {
      // 2a. Disponibilidad para un barbero específico
      const barber = settings.barbers.find((b) => b.id === barberId);
      if (!barber || !barber.isAvailable) return [];

      const schedule =
        barber.schedule && barber.schedule.length > 0
          ? barber.schedule
          : globalSchedule;

      // Filtramos slots que afectan a este barbero:
      // - Sus propios slots (barberId === id)
      // - Slots globales (barberId === null/undefined) que bloquean a todos
      const relevantSlots = reservedSlots.filter(
        (s) =>
          s.barberId === barberId ||
          s.barberId === null ||
          s.barberId === undefined
      );

      return this.slotsService.execute(
        date,
        schedule,
        exceptions,
        relevantSlots
      );
    } else {
      // 2b. Disponibilidad general (cualquier barbero libre)
      // Retorna slots donde AL MENOS UN barbero está disponible
      const activeBarbers = settings.barbers.filter((b) => b.isAvailable);
      const allAvailableSlots = new Set<string>();

      for (const barber of activeBarbers) {
        const schedule =
          barber.schedule && barber.schedule.length > 0
            ? barber.schedule
            : globalSchedule;

        const relevantSlots = reservedSlots.filter(
          (s) =>
            s.barberId === barber.id ||
            s.barberId === null ||
            s.barberId === undefined
        );

        const slots = this.slotsService.execute(
          date,
          schedule,
          exceptions,
          relevantSlots
        );
        slots.forEach((s) => allAvailableSlots.add(s));
      }

      return Array.from(allAvailableSlots).sort();
    }
  }

  /**
   * Retorna la capacidad (número de barberos libres) por slot horario.
   * Útil para mostrar indicadores en la UI.
   */
  getSlotCapacity(date: Date): Map<string, number> {
    const settings = this.barberSettings();
    if (!settings?.barberSelection) return new Map();

    const capacityMap = new Map<string, number>();
    const activeBarbers = settings.barbers.filter((b) => b.isAvailable);
    const reservedSlots = this.reservedSlots();
    const exceptions = this.exceptions();
    const globalSchedule = this.rawSchedule();

    for (const barber of activeBarbers) {
      const schedule =
        barber.schedule && barber.schedule.length > 0
          ? barber.schedule
          : globalSchedule;

      const relevantSlots = reservedSlots.filter(
        (s) =>
          s.barberId === barber.id ||
          s.barberId === null ||
          s.barberId === undefined
      );

      const slots = this.slotsService.execute(
        date,
        schedule,
        exceptions,
        relevantSlots
      );

      slots.forEach((time) => {
        const current = capacityMap.get(time) || 0;
        capacityMap.set(time, current + 1);
      });
    }

    return capacityMap;
  }

  isBarberAvailable(
    barberId: string,
    date: Date,
    time: string,
    service?: Service,
    hairLength?: 'short' | 'medium' | 'long' | null
  ): boolean {
    const settings = this.barberSettings();
    const barber = settings?.barbers.find((b) => b.id === barberId);
    if (!barber || !barber.isAvailable) return false;

    const reservedSlots = this.reservedSlots();
    const exceptions = this.exceptions();
    const globalSchedule = this.rawSchedule();
    const schedule =
      barber.schedule && barber.schedule.length > 0
        ? barber.schedule
        : globalSchedule;

    const relevantSlots = reservedSlots.filter(
      (s) =>
        s.barberId === barberId ||
        s.barberId === null ||
        s.barberId === undefined
    );

    const availableSlots = this.slotsService.execute(
      date,
      schedule,
      exceptions,
      relevantSlots
    );

    // Calculate required slots
    let segments = service?.timeSegments;
    if (service && hairLength && service.hairLengthModifiers) {
      const mod = service.hairLengthModifiers[hairLength];
      if (mod && mod.segments && mod.segments.length > 0) {
        segments = mod.segments;
      } else if (mod && mod.time) {
        segments = [{ duration: mod.time, breakAfter: 0 }];
      }
    }

    if (!segments || segments.length === 0) {
      segments = [{ duration: 30, breakAfter: 0 }];
    }

    let currentMinutes =
      parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

    for (const segment of segments) {
      const durationSlots = Math.ceil(segment.duration / 30);
      for (let i = 0; i < durationSlots; i++) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(
          2,
          '0'
        )}`;

        if (!availableSlots.includes(timeStr)) {
          return false;
        }
        currentMinutes += 30;
      }
      if (segment.breakAfter) {
        currentMinutes += segment.breakAfter;
      }
    }

    return true;
  }

  // Esta señal se recalcula automáticamente cuando cambia 'rawSchedule'.
  // Contiene la lógica de transformación que antes tenías en el Footer.
  readonly formattedSchedule = computed(() => {
    const schedule = this.rawSchedule();

    if (!schedule || schedule.length === 0) {
      return ['Cargando horario...'];
    }
    const formattedText = this.scheduleService.formatScheduleText(schedule);
    return this.scheduleService.splitScheduleText(formattedText);
  });

  constructor() {
    this.loadCriticalData();
    this.startClock();

    afterNextRender(() => {
      this.loadDeferredData();
    });
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

  private loadCriticalData() {
    // 1. Cargar Horario (Crítico para Header)
    this.getSchedule.execute().subscribe({
      next: (schedule) => this.rawSchedule.set(schedule),
      error: (err) => {
        console.error('Error loading schedule:', err);
        this.rawSchedule.set([]);
      },
    });

    // 2. Cargar Excepciones (Crítico para Header)
    this.getExceptions.execute().subscribe({
      next: (exceptions) => this.exceptions.set(exceptions),
      error: (err) => {
        console.error('Error loading exceptions:', err);
        this.exceptions.set([]);
      },
    });
    this.loadGalleryImages();
  }

  private loadDeferredData() {
    // 3. Cargar Info de Contacto
    this.getInfo.execute().subscribe({
      next: (info) => this.contactInfo.set(info),
      error: (err) => {
        console.error('Error loading contact info:', err);
        this.contactInfo.set(
          new ContactInfo(
            '000000000',
            'error@loading.com',
            'Error cargando información'
          )
        );
      },
    });

    // 4. Cargar Servicios
    this.getServices.execute().subscribe({
      next: (services) => this.services.set(services),
      error: (err) => {
        console.error('Error loading services:', err);
        this.services.set([]);
      },
    });

    // 5. Cargar Configuración de Barberos
    this.getBarberSettings.execute().subscribe({
      next: (settings) => this.barberSettings.set(settings),
      error: (err) => {
        console.error('Error loading barber settings:', err);
        this.barberSettings.set(null);
      },
    });

    // 6. Cargar Slots Reservados
    this.getReservedSlots.execute().subscribe({
      next: (slots) => this.reservedSlots.set(slots),
      error: (err) => {
        console.error('Error loading reserved slots:', err);
        this.reservedSlots.set([]);
      },
    });

    // 7. Cargar Citas
    this.getAppointments.execute().subscribe({
      next: (appointment) => this.appointments.set(appointment),
      error: (err) => {
        console.error('Error loading appointment:', err);
        this.appointments.set([]);
      },
    });
  }

  public loadGalleryImages(): Promise<void> {
    return new Promise((resolve) => {
      this.getImages.execute(PhotoType.GALLERY).subscribe({
        next: (images) => {
          this.galleryImages.set(images);
          resolve();
        },
        error: (err) => {
          console.error('Error loading gallery images:', err);
          this.galleryImages.set([]);
          resolve();
        },
      });
    });
  }
  // --- HELPER METHODS FOR BUSINESS STATUS ---

  private calculateBusinessStatus(
    schedule: ScheduleDay[],
    checkDate: Date,
    exceptions: ExceptionItem[] = []
  ): BusinessStatus {
    const dayMap = [
      'domingo',
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
    ];
    const dayIndex = checkDate.getDay();
    const currentTime = `${String(checkDate.getHours()).padStart(
      2,
      '0'
    )}:${String(checkDate.getMinutes()).padStart(2, '0')}`;

    // 1. Buscar si hoy es una excepción
    const checkDateStr = checkDate.toISOString().split('T')[0];
    const exception = exceptions.find((ex) => {
      if (ex.exceptionType === 'range' && ex.startDate && ex.endDate) {
        return checkDateStr >= ex.startDate && checkDateStr <= ex.endDate;
      }
      return ex.date === checkDateStr;
    });

    // 2. Determinar la configuración del día (Excepción o Horario Normal)
    let todayConfig: { closed: boolean; intervals: any[]; name: string };

    if (exception) {
      todayConfig = {
        closed: exception.closed,
        intervals: exception.intervals,
        name:
          exception.exceptionType === 'range'
            ? 'Vacaciones'
            : 'Horario Especial',
      };
    } else {
      const regularDay = schedule.find((d) => d.day === dayMap[dayIndex]);
      todayConfig = {
        closed: regularDay?.closed ?? true,
        intervals: regularDay?.intervals ?? [],
        name: regularDay?.name ?? dayMap[dayIndex],
      };
    }

    const status: BusinessStatus = {
      isOpen: false,
      currentDay: todayConfig.name,
      isWarning: false,
      remainingMinutes: 0,
    };

    // 3. Si está cerrado hoy (por horario normal o excepción)
    if (todayConfig.closed || todayConfig.intervals.length === 0) {
      const next = this.findNextOpenDay(schedule, checkDate, exceptions);
      status.nextOpenDay = next.day;
      status.nextOpenTime = next.time;
      status.timeUntilChange = this.diffTimeString(checkDate, next.date);

      const diffMinutes = Math.floor(
        (next.date.getTime() - checkDate.getTime()) / 60000
      );
      if (diffMinutes > 0 && diffMinutes <= 60) {
        status.isWarning = true;
        status.warningType = 'opening';
        status.remainingMinutes = diffMinutes;
        status.remainingSeconds = diffMinutes * 60;
      }
      return status;
    }

    // 4. Si está abierto hoy, comprobar intervalos
    for (const interval of todayConfig.intervals) {
      if (currentTime >= interval.open && currentTime < interval.close) {
        status.isOpen = true;
        status.openTime = interval.open;
        status.closeTime = interval.close;

        const closeDt = this.createDateTimeFromTime(checkDate, interval.close);
        const diffMinutes = Math.floor(
          (closeDt.getTime() - checkDate.getTime()) / 60000
        );
        if (diffMinutes <= 60) {
          status.isWarning = true;
          status.warningType = 'closing';
          status.remainingMinutes = diffMinutes;
          status.remainingSeconds = diffMinutes * 60;
        }
        return status;
      }
    }

    // 5. Si hoy abre pero ahora mismo está cerrado (entre turnos o antes de abrir)
    const nextInterval = todayConfig.intervals.find(
      (i: any) => currentTime < i.open
    );
    if (nextInterval) {
      const openDt = this.createDateTimeFromTime(checkDate, nextInterval.open);
      const diffMinutes = Math.floor(
        (openDt.getTime() - checkDate.getTime()) / 60000
      );
      if (diffMinutes <= 60) {
        status.isWarning = true;
        status.warningType = 'opening';
        status.remainingMinutes = diffMinutes;
        status.remainingSeconds = diffMinutes * 60;
      }
      status.nextOpenDay = todayConfig.name;
      status.nextOpenTime = nextInterval.open;
      status.timeUntilChange = this.diffTimeString(checkDate, openDt);
      return status;
    }

    // 6. Si ya cerró por hoy
    const next = this.findNextOpenDay(schedule, checkDate, exceptions);
    status.nextOpenDay = next.day;
    status.nextOpenTime = next.time;
    status.timeUntilChange = this.diffTimeString(checkDate, next.date);
    const diffMinutes = Math.floor(
      (next.date.getTime() - checkDate.getTime()) / 60000
    );
    if (diffMinutes <= 60) {
      status.isWarning = true;
      status.warningType = 'opening';
      status.remainingMinutes = diffMinutes;
      status.remainingSeconds = diffMinutes * 60;
    }

    return status;
  }

  private findNextOpenDay(
    schedule: ScheduleDay[],
    fromDate: Date,
    exceptions: ExceptionItem[]
  ) {
    const dayMap = [
      'domingo',
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
    ];

    // Buscamos en los próximos 30 días para cubrir vacaciones largas
    for (let i = 1; i <= 30; i++) {
      const nextDate = new Date(fromDate);
      nextDate.setDate(fromDate.getDate() + i);
      const nextDateStr = nextDate.toISOString().split('T')[0];
      const dayIndex = nextDate.getDay();
      const dayKey = dayMap[dayIndex];

      // Comprobar si es excepción
      const exception = exceptions.find((ex) => {
        if (ex.exceptionType === 'range' && ex.startDate && ex.endDate) {
          return nextDateStr >= ex.startDate && nextDateStr <= ex.endDate;
        }
        return ex.date === nextDateStr;
      });

      if (exception) {
        if (!exception.closed && exception.intervals.length > 0) {
          const openDate = this.createDateTimeFromTime(
            nextDate,
            exception.intervals[0].open
          );
          return {
            day:
              exception.exceptionType === 'range'
                ? 'Fin de Vacaciones'
                : 'Horario Especial',
            time: exception.intervals[0].open,
            date: openDate,
          };
        }
        // Si es excepción cerrada, continuamos al siguiente día
        continue;
      }

      // Si no es excepción, miramos horario normal
      const day = schedule.find((d) => d.day === dayKey);
      if (day && !day.closed && day.intervals.length > 0) {
        const openDate = this.createDateTimeFromTime(
          nextDate,
          day.intervals[0].open
        );
        return { day: day.name, time: day.intervals[0].open, date: openDate };
      }
    }

    return { day: 'Desconocido', time: '??:??', date: new Date() };
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
