import {
  Component,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewInit,
  inject,
  signal,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

// Domain Imports
import {
  Appointment,
  Service,
  Barber,
  ExceptionItem,
  AvailabilityContext,
  ExceptionHandler,
  WeeklyScheduleHandler,
} from '@domain/index';
import { Phone } from '@domain/shared/value-objects/phone.vo';
import { TimeUtils } from '@domain/shared/utils/time.utils';

// Application Imports
import {
  AddAppointmentUseCase,
  DeleteAppointmentUseCase,
  UpdateAppointmentUseCase,
} from '@application/appointments';
import { GetBlacklistUseCase } from '@application/blacklist';
import { BusinessStateService } from '@presentation/shared/business-state.service';

// Presentation Imports
import {
  AppointmentView,
  toAppointmentView,
} from '@presentation/shared/models/appointment-view.model';
import { AlertService } from '@presentation/shared/alert/alert.service';
import { getErrorMessage } from '@domain/shared/utils/error.utils';
import { PhoneInputComponent } from '@presentation/shared/components/phone-input/phone-input.component';
import { TenantService } from 'src/app/config/tenant.service';

type EditableAppointment = Partial<Appointment>;

@Component({
  selector: 'app-appointment-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneInputComponent],
  templateUrl: './appointment-management.component.html',
  styleUrls: ['./appointment-management.component.scss'],
})
export class AppointmentManagementComponent
  implements OnDestroy, AfterViewInit
{
  @ViewChild('calendarBody', { static: false })
  calendarBody!: ElementRef<HTMLElement>;
  @ViewChild('selectedDetail', { static: false })
  selectedDetail!: ElementRef<HTMLElement>;
  @ViewChild('calendarHeader', { static: false })
  calendarHeader!: ElementRef<HTMLElement>;
  @ViewChild('editFormContainer', { static: false })
  editFormContainer!: ElementRef<HTMLElement>;

  // Dependencies
  private readonly fb = inject(FormBuilder);
  public readonly businessState = inject(BusinessStateService);
  private readonly toast = inject(AlertService);
  private readonly addAppointmentUseCase = inject(AddAppointmentUseCase);
  private readonly updateAppointmentUseCase = inject(UpdateAppointmentUseCase);
  private readonly deleteAppointmentUseCase = inject(DeleteAppointmentUseCase);
  private readonly getBlacklistUseCase = inject(GetBlacklistUseCase);
  private readonly tenantService = inject(TenantService);

  public readonly tenantConfig = this.tenantService.getTenantConfig().features;

  // --- Signals State ---

  // Data signals
  public schedule = this.businessState.rawSchedule;
  public exceptions = this.businessState.exceptions;
  public appointments = this.businessState.appointments;
  public services = this.businessState.services;

  // Blacklist data
  private blacklist$ = this.getBlacklistUseCase.execute().pipe(
    catchError(err => {
      console.error('Error loading blacklist:', err);
      return of([]);
    })
  );
  private blacklist = toSignal(this.blacklist$, { initialValue: [] });

  // 1. Citas (Source of Truth)

  // 2. Fecha seleccionada
  public selectedDate = signal<Date>(new Date());

  // 3. ID de cita seleccionada
  public selectedAppointmentId = signal<string | null>(null);
  
  // Barbers
  public barbers = computed(() => this.businessState.barberSettings()?.barbers ?? []);

  // --- Filtering State ---
  public searchQuery = signal<string>('');
  public filterServiceName = signal<string>('');
  public filterBarberId = signal<string>('');

  // --- Computed State ---
  public allowBarberSelection = computed(
    () => this.businessState.barberSettings()?.barberSelection ?? false
  );

  private readonly servicesByName = computed(
    () => new Map(this.services().map((s) => [s.name, s] as const))
  );

  public appointmentViews = computed<AppointmentView[]>(() => {
    const servicesByName = this.servicesByName();
    return this.appointments().map((a) => toAppointmentView(a, servicesByName));
  });

  public filteredAppointmentViews = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const serviceName = this.filterServiceName();
    const barberId = this.filterBarberId();

    const filtered = this.appointmentViews().filter((a) => {
      if (serviceName && a.serviceName !== serviceName) return false;
      if (barberId && a.barberId !== barberId) return false;

      if (!query) return true;

      const nameMatch = a.name?.toLowerCase().includes(query);
      const phoneMatch = a.phone?.toLowerCase().includes(query);
      const serviceNameMatch = a.serviceName?.toLowerCase().includes(query);

      return Boolean(nameMatch || phoneMatch || serviceNameMatch);
    });

    return filtered
      .slice()
      .sort((x, y) => y.datetime.getTime() - x.datetime.getTime());
  });

  // Citas filtradas para el día seleccionado
  public filteredForDay = computed(() => {
    const all = this.appointmentViews();
    const date = this.selectedDate();
    const iso = TimeUtils.toISODate(date);

    return all
      .filter((a) => a.dateISO === iso)
      .sort((x, y) =>
        (x.timeNormalized || '').localeCompare(y.timeNormalized || '')
      );
  });

  // Cita seleccionada (objeto completo)
  public selectedAppointment = computed(() => {
    const id = this.selectedAppointmentId();
    const all = this.appointmentViews();
    if (!id || !all.length) return null;
    return all.find((a) => a.id === id) || null;
  });

  // Slots ocupados en el día (calculado dinámicamente)
  public bookedSlotsForDay = computed(() => {
    const dayAppointments = this.filteredForDay();
    const bookedSlots: string[] = [];

    dayAppointments.forEach((appointment) => {
      if (!appointment.timeNormalized || appointment.timeNormalized === '—')
        return;

      const service = this.ensureServiceInstance(appointment.service);
      if (!service) return;

      const startMinutes = TimeUtils.timeToMinutes(appointment.timeNormalized);
      const segments = service.getTimeSegmentsForLength(
        appointment.hairLengthChoice as any
      );

      let currentMinutes = startMinutes;

      segments.forEach((segment) => {
        // Marcar slots activos
        for (
          let m = currentMinutes;
          m < currentMinutes + segment.duration;
          m += 30
        ) {
          bookedSlots.push(TimeUtils.minutesToTime(m));
        }
        currentMinutes += segment.duration;

        if (segment.breakAfter) {
          currentMinutes += segment.breakAfter;
        }
      });
    });
    return bookedSlots;
  });

  // Horas a mostrar en el calendario (Disponibles + Ocupadas)
  public hours = computed(() => {
    const selectedDate = this.selectedDate();
    const schedule = this.businessState.rawSchedule();
    const exceptions = this.businessState.exceptions(); // ← usar state

    const context: AvailabilityContext = {
      date: selectedDate,
      schedule,
      exceptions,
    };

    const exceptionHandler = new ExceptionHandler();
    const weeklyHandler = new WeeklyScheduleHandler();
    exceptionHandler.setNext(weeklyHandler);

    const availability = exceptionHandler.handle(context);
    let availableHours: string[] = [];

    if (availability.isAvailable && availability.intervals) {
      availability.intervals.forEach((interval) => {
        availableHours.push(
          ...TimeUtils.hoursRangeFromOpenClose(interval.open, interval.close)
        );
      });
    }

    const booked = this.bookedSlotsForDay();
    return [...new Set([...availableHours, ...booked])].sort();
  });

  // UI State (Mutable)
  isEditing = false;
  isCreating = false;
  editedAppointment: EditableAppointment | null = null;
  isSaving = false;
  editForm: FormGroup;

  // Barbers are now a signal
  // barbers: Barber[] = []; // removed duplicate
  barberSelectionEnabled = false;

  private scrollTimeout: any;

  constructor() {
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      phone: [''], // Validator handled by component
      date: ['', Validators.required],
      time: ['', Validators.required],
      serviceId: ['', Validators.required],
      hairLength: [''],
      barberId: [''],
      description: [''],
    });

    // Suscripción a cambios de servicio para validación dinámica
    this.editForm.get('serviceId')?.valueChanges.subscribe((serviceName) => {
      const service = this.services().find((s) => s.name === serviceName);
      const hairLengthControl = this.editForm.get('hairLength');

      if (service?.requiresHairLength) {
        hairLengthControl?.setValidators([Validators.required]);
      } else {
        hairLengthControl?.clearValidators();
        hairLengthControl?.setValue('');
      }
      hairLengthControl?.updateValueAndValidity();
    });

    // Effect para scroll automático cuando cambia la selección
    effect(() => {
      const appointment = this.selectedAppointment();
      const dayList = this.filteredForDay();

      if (appointment && dayList.some((a) => a.id === appointment.id)) {
        // Usamos setTimeout para asegurar que el DOM se ha actualizado
        setTimeout(() => {
          if (this.isMobileViewport()) {
            this.scrollToSelectedDetail();
          } else if (appointment.timeNormalized) {
            this.scrollToAppointment(appointment.timeNormalized);
          }
        }, 100);
      }
    });
  }

  ngAfterViewInit() {
    // No necesitamos lógica de inicialización compleja gracias a Signals
  }

  ngOnDestroy(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  // --- Logic: Navigation ---

  prevDay() {
    this.navigateDate(-1);
  }
  nextDay() {
    this.navigateDate(1);
  }
  prevWeek() {
    this.navigateDate(-7);
  }
  nextWeek() {
    this.navigateDate(7);
  }

  prevMonth() {
    const d = new Date(this.selectedDate());
    d.setMonth(d.getMonth() - 1);
    this.selectedDate.set(this.findNearestAvailableDay(d, true));
    this.validateSelectedAppointmentForCurrentDay();
  }

  nextMonth() {
    const d = new Date(this.selectedDate());
    d.setMonth(d.getMonth() + 1);
    this.selectedDate.set(this.findNearestAvailableDay(d, true));
    this.validateSelectedAppointmentForCurrentDay();
  }

  goToToday() {
    this.selectedDate.set(new Date());
    this.selectedAppointmentId.set(null);
  }

  private navigateDate(days: number) {
    const targetDate = new Date(
      this.selectedDate().getTime() + days * 24 * 3600 * 1000
    );
    const availableDate = this.findNearestAvailableDay(targetDate, days > 0);
    this.selectedDate.set(availableDate);
    this.validateSelectedAppointmentForCurrentDay();
  }

  private findNearestAvailableDay(
    startDate: Date,
    searchForward: boolean
  ): Date {
    let currentDate = new Date(startDate);
    let attempts = 0;
    const maxAttempts = 60;

    while (attempts < maxAttempts) {
      if (this.isDayAvailable(currentDate)) {
        return currentDate;
      }
      currentDate.setDate(currentDate.getDate() + (searchForward ? 1 : -1));
      attempts++;
    }
    return startDate;
  }

  private isDayAvailable(date: Date): boolean {
    const schedule = this.businessState.rawSchedule();
    const exceptions = this.businessState.exceptions();

    if (!schedule || schedule.length === 0) return true;

    const context: AvailabilityContext = { date, schedule, exceptions };

    const exceptionHandler = new ExceptionHandler();
    const weeklyHandler = new WeeklyScheduleHandler();
    exceptionHandler.setNext(weeklyHandler);

    return exceptionHandler.handle(context).isAvailable;
  }

  // --- Logic: Availability Check ---

  isHourAvailable(hour: string): boolean {
    // 1. Chequear si está ocupado (usando el computed)
    if (this.bookedSlotsForDay().includes(hour)) {
      return false;
    }

    // 2. Chequear si el negocio está abierto
    const selectedDate = this.selectedDate();
    const schedule = this.businessState.rawSchedule();
    const context: AvailabilityContext = {
      date: selectedDate,
      schedule,
      exceptions: [],
    };

    const exceptionHandler = new ExceptionHandler();
    const weeklyHandler = new WeeklyScheduleHandler();
    exceptionHandler.setNext(weeklyHandler);

    const availability = exceptionHandler.handle(context);

    if (!availability.isAvailable || !availability.intervals) return false;

    const hourMins = TimeUtils.timeToMinutes(hour);
    return availability.intervals.some((interval) => {
      const start = TimeUtils.timeToMinutes(interval.open);
      const end = TimeUtils.timeToMinutes(interval.close);
      return hourMins >= start && hourMins < end;
    });
  }

  // --- Logic: Appointment Presentation ---

  getAppointmentDuration(appointment: AppointmentView): string {
    const service = this.ensureServiceInstance(appointment.service);
    if (!service) return '30min';
    return `${service.computeTotalTime(
      appointment.hairLengthChoice as any
    )}min`;
  }

  getAppointmentSlotCount(appointment: AppointmentView): number {
    const service = this.ensureServiceInstance(appointment.service);
    if (!service) return 1;
    const totalMinutes = service.computeTotalTime(
      appointment.hairLengthChoice as any
    );
    return Math.ceil(totalMinutes / 30);
  }

  // Helpers de visualización

  findReservations(
    list: AppointmentView[],
    hour: string
  ): AppointmentView[] {
    const slotMinutes = TimeUtils.timeToMinutes(hour);

    return list.filter((a) => {
      if (!a.timeNormalized) return false;
      const startMinutes = TimeUtils.timeToMinutes(a.timeNormalized);
      const service = this.ensureServiceInstance(a.service);
      if (!service) return false;

      const segments = service.getTimeSegmentsForLength(
        a.hairLengthChoice as any
      );
      let current = startMinutes;

      for (const seg of segments) {
        if (slotMinutes >= current && slotMinutes < current + seg.duration) {
          return true;
        }
        current += seg.duration + (seg.breakAfter || 0);
      }
      return false;
    });
  }

  findReservation(
    list: AppointmentView[],
    hour: string
  ): AppointmentView | undefined {
    return this.findReservations(list, hour)[0];
  }

  isBreakSlot(list: AppointmentView[], hour: string): boolean {
    return !!this.findBreakSlot(list, hour);
  }

  findBreakSlot(
    list: AppointmentView[],
    hour: string
  ): { appointment: AppointmentView; breakInfo: any } | undefined {
    const slotMinutes = TimeUtils.timeToMinutes(hour);

    for (const appointment of list) {
      if (!appointment.timeNormalized) continue;
      const startMinutes = TimeUtils.timeToMinutes(appointment.timeNormalized);
      const service = this.ensureServiceInstance(appointment.service);
      if (!service) continue;

      const segments = service.getTimeSegmentsForLength(
        appointment.hairLengthChoice as any
      );
      let current = startMinutes;

      for (const seg of segments) {
        current += seg.duration;

        if (seg.breakAfter && seg.breakAfter > 0) {
          if (
            slotMinutes >= current &&
            slotMinutes < current + seg.breakAfter
          ) {
            return {
              appointment,
              breakInfo: { start: current, duration: seg.breakAfter },
            };
          }
          current += seg.breakAfter;
        }
      }
    }
    return undefined;
  }

  isMainAppointmentSlot(
    dayList: AppointmentView[],
    hour: string,
    appointment: AppointmentView
  ): boolean {
    return appointment.timeNormalized === hour;
  }

  isAppointmentContinuation(dayList: AppointmentView[], hour: string): boolean {
    const appt = this.findReservation(dayList, hour);
    return !!appt && !this.isMainAppointmentSlot(dayList, hour, appt);
  }

  isAppointmentStart(dayList: AppointmentView[], hour: string): boolean {
    const appt = this.findReservation(dayList, hour);
    if (!appt || !appt.timeNormalized) return false;
    const slotMins = TimeUtils.timeToMinutes(hour);
    const prevHour = TimeUtils.minutesToTime(slotMins - 30);
    const prevAppt = this.findReservation(dayList, prevHour);
    return appt.id !== prevAppt?.id;
  }

  isAppointmentEnd(dayList: AppointmentView[], hour: string): boolean {
    const appt = this.findReservation(dayList, hour);
    if (!appt) return false;
    const slotMins = TimeUtils.timeToMinutes(hour);
    const nextHour = TimeUtils.minutesToTime(slotMins + 30);
    const nextAppt = this.findReservation(dayList, nextHour);
    return appt.id !== nextAppt?.id;
  }

  isConnectedToPrevious(appointment: AppointmentView, hour: string): boolean {
    const slotMins = TimeUtils.timeToMinutes(hour);
    const prevHour = TimeUtils.minutesToTime(slotMins - 30);
    const prevAppt = this.findReservation([appointment], prevHour);
    return !!prevAppt;
  }

  isConnectedToNext(appointment: AppointmentView, hour: string): boolean {
    const slotMins = TimeUtils.timeToMinutes(hour);
    const nextHour = TimeUtils.minutesToTime(slotMins + 30);
    const nextAppt = this.findReservation([appointment], nextHour);
    return !!nextAppt;
  }

  // --- CRUD Operations ---

  startCreateFromSlot(timeSlot: string) {
    this.isCreating = true;
    this.isEditing = false;
    this.editedAppointment = null;
    this.editForm.reset();
    this.editForm.patchValue({
      date: TimeUtils.toISODate(this.selectedDate()),
      time: timeSlot,
    });
    if (this.isMobileViewport()) this.scrollToEditForm();
  }

  startEdit(appointment: AppointmentView) {
    this.isEditing = true;
    this.isCreating = false;
    this.editedAppointment = {
      ...appointment,
      hairLengthChoice: appointment.hairLengthChoice as
        | 'short'
        | 'medium'
        | 'long'
        | undefined,
    };
    this.selectedAppointmentId.set(appointment.id || null);
    this.editForm.patchValue({
      name: appointment.name,
      phone: appointment.phone,
      date: appointment.dateISO,
      time: appointment.timeNormalized,
      serviceId: appointment.service?.name,
      hairLength: appointment.hairLengthChoice,
      barberId: appointment.barber,
      description: appointment.description,
    });
    if (this.isMobileViewport()) this.scrollToEditForm();
  }

  cancelEdit() {
    this.isEditing = false;
    this.isCreating = false;
    this.editedAppointment = null;
  }

  async saveEdit() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    try {
      const formData = this.editForm.value;
      const serviceInstance = this.services().find(
        (s) => s.name === formData.serviceId
      );

      const [y, m, d] = formData.date.split('-').map(Number);
      const [h, min] = formData.time.split(':').map(Number);
      const datetime = new Date(y, m - 1, d, h, min);

      // El select almacena barber.name — resolvemos el id real
      const selectedBarberName = formData.barberId || null;
      const selectedBarber = this.barbers().find(b => b.name === selectedBarberName);

      const appointmentDomain: Appointment = new Appointment(
        datetime,
        serviceInstance!,
        this.isEditing ? this.editedAppointment?.id : undefined,
        formData.description,
        formData.name,
        formData.phone,
        selectedBarberName,              // barber (nombre)
        selectedBarber?.id ?? null,      // barberId (id real)
        selectedBarberName,              // barberName
        formData.hairLength || null      // hairLengthChoice
      );

      if (this.isEditing && this.editedAppointment?.id) {
        await this.updateAppointmentUseCase.execute(
          this.editedAppointment.id,
          appointmentDomain
        );
        this.toast.success('Cita actualizada correctamente');
      } else {
        await this.addAppointmentUseCase.execute(appointmentDomain);
        this.toast.success('Cita creada correctamente');
      }

      this.isEditing = false;
      this.isCreating = false;
      this.editForm.reset();
    } catch (error: any) {
      console.error('Error guardando cita:', error);
      this.toast.error(getErrorMessage(error));
    } finally {
      this.isSaving = false;
    }
  }

  async deleteAppointment(id: string) {
    if (!(await this.toast.confirm('¿Eliminar cita?'))) return;
    try {
      await this.deleteAppointmentUseCase.execute(id);
      this.toast.success('Cita eliminada');
      this.selectedAppointmentId.set(null);
      if (this.isEditing) this.cancelEdit();
    } catch (error) {
      this.toast.error(getErrorMessage(error));
    }
  }

  // --- UI Helpers ---

  chooseAppointment(id: string | undefined) {
    if (!id) return;
    this.selectedAppointmentId.set(id);

    // Buscar si la cita está en otro día
    const appt = this.appointments().find((a) => a.id === id);
    if (appt) {
      const apptDate = new Date(appt.datetime);
      if (
        TimeUtils.toISODate(apptDate) !==
        TimeUtils.toISODate(this.selectedDate())
      ) {
        this.selectedDate.set(apptDate);
      }
    }
  }

  toISODate(d: Date) {
    return TimeUtils.toISODate(d);
  }

  formatDateHeader(d: Date) {
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getServiceDuration(service: Service) {
    return service.computeTotalTime();
  }

  getServiceDurationLabel(service: Service) {
    if (service.requiresHairLength) {
      return service.getEstimatedTimeRange();
    }
    return `${service.computeTotalTime()} min`;
  }

  getHairLengthLabel(length: string | null | undefined): string {
    const map: Record<string, string> = {
      short: 'Corto',
      medium: 'Medio',
      long: 'Largo',
    };
    return length && map[length] ? map[length] : 'No especificado';
  }

  getStrikesForPhone(phone: string | null | undefined): number {
    if (!phone) return 0;
    const entry = this.blacklist().find(e => e.phone === phone);
    return entry?.strikeCount || 0;
  }

  getCapacityForSlot(time: string): number {
    const settings = this.businessState.barberSettings();
    if (!settings?.barberSelection) {
      return 1;
    }
  
    const barbers = this.barbers();
    const activeBarbers = barbers.filter(b => b.isAvailable);
    
    if (activeBarbers.length === 0) return 1;

    const date = this.selectedDate();
    const dayIndex = date.getDay(); // 0 Sun, 1 Mon...
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = dayNames[dayIndex];

    let workingCount = 0;
    const minutes = TimeUtils.timeToMinutes(time);

    for (const barber of activeBarbers) {
        // Usar horario personalizado o global
        const scheduleToUse = (barber.schedule && barber.schedule.length > 0) 
            ? barber.schedule 
            : this.businessState.rawSchedule();
            
        const daySchedule = scheduleToUse.find(d => d.name === currentDayName);
        
        if (daySchedule && !daySchedule.closed) {
           const works = daySchedule.intervals.some(interval => {
               const start = TimeUtils.timeToMinutes(interval.open);
               const end = TimeUtils.timeToMinutes(interval.close);
               return minutes >= start && minutes < end;
           });
           if (works) workingCount++;
        }
    }
    
    return workingCount;
  }

  getRange(n: number): number[] {
    return Array(Math.max(0, n)).fill(0).map((x, i) => i);
  }

  get selectedServiceRequiresHairLength(): boolean {
    const serviceName = this.editForm.get('serviceId')?.value;
    if (!serviceName) return false;
    const service = this.services().find((s) => s.name === serviceName);
    return service?.requiresHairLength ?? false;
  }

  // --- Actions ---

  public resetFilters(): void {
    this.searchQuery.set('');
    this.filterServiceName.set('');
    this.filterBarberId.set('');
  }

  // --- Private Helpers ---

  private ensureServiceInstance(service: any): Service {
    if (!service) return new Service('Desconocido', '', []);
    if (service instanceof Service) return service;

    return new Service(
      service.name,
      service.description,
      service.timeSegments,
      service.requiresHairLength,
      service.hairLengthModifiers,
      service.imageUrl,
      service.id,
      service.hourRange,
      service.basePrice,
    );
  }

  getPriceForAppointment(appointment: AppointmentView): number | null {
    const service = this.ensureServiceInstance(appointment.service);
    const price = service.getPrice(appointment.hairLengthChoice as any);
    return price > 0 ? price : (price === 0 && service.basePrice != null ? 0 : null);
  }

  getServicePriceLabel(service: Service): string {
    if (service.requiresHairLength) {
      return service.getEstimatedPriceRange() ?? '';
    }
    return service.basePrice != null ? `${service.basePrice}€` : '';
  }

  private validateSelectedAppointmentForCurrentDay() {
    const selectedId = this.selectedAppointmentId();
    if (!selectedId) return;
    const dayAppointments = this.filteredForDay();
    if (!dayAppointments.some((a) => a.id === selectedId)) {
      this.selectedAppointmentId.set(null);
    }
  }

  private scrollToAppointment(time: string) {
    setTimeout(() => {
      if (!this.calendarBody?.nativeElement) return;
      const hour = time.split(':')[0] + ':00';
      const el = this.calendarBody.nativeElement.querySelector(
        `[data-hour="${hour}"]`
      );
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }

  private isMobileViewport(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 768px)').matches
    );
  }

  private scrollToSelectedDetail() {
    setTimeout(
      () =>
        this.selectedDetail?.nativeElement?.scrollIntoView({
          behavior: 'smooth',
        }),
      100
    );
  }

  private scrollToEditForm() {
    setTimeout(
      () =>
        this.editFormContainer?.nativeElement?.scrollIntoView({
          behavior: 'smooth',
        }),
      100
    );
  }
}
