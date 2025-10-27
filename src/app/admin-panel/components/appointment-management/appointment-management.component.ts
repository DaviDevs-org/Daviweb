import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentManagerService } from '../../../services/admin-panel/appointment-management.service';
import {
  Appointment,
  Service,
  ScheduleDay,
  ExceptionItem,
  AppointmentFirestore,
  ServiceDTO
} from '../../types/admin.types';
import {BehaviorSubject, Observable, combineLatest, firstValueFrom} from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceManager } from '../../../services/admin-panel/services-management.service';
import { AppointmentService } from '../../../services/appointments.service';
import { InfoManager } from '../../../services/admin-panel/info-management.service';
import { AlertService } from '../../../services/alert/alert.service';
import { Barber } from '../../types/admin.types';

@Component({
  selector: 'app-appointment-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './appointment-management.component.html',
  styleUrls: ['./appointment-management.component.scss']
})
export class AppointmentManagementComponent implements OnDestroy, AfterViewInit {
  @ViewChild('calendarBody', { static: false }) calendarBody!: ElementRef<HTMLElement>;

  appointments$: Observable<Appointment[]>;
  selectedDate$ = new BehaviorSubject<Date>(new Date());
  filteredForDay$: Observable<Appointment[]>;
  selectedAppointmentId$ = new BehaviorSubject<string | null>(null);
  selectedAppointment$: Observable<Appointment | null>;

  isEditing = false;
  isCreating = false;
  editedAppointment: Appointment | null = null;
  isSaving = false;
  editForm: FormGroup;
  services: Service[] = [];
  barbers: Barber[] = [];
  barberSelectionEnabled = false;

  // Nuevos datos desde InfoManager (igual que en calendar-selector)
  schedule: ScheduleDay[] = [];
  exceptions: ExceptionItem[] = [];
  hours: string[] = [];
  bookedSlotsByDate: Record<string, string[]> = {};

  private scrollTimeout: any;

  constructor(
    private apptSvc: AppointmentManagerService,
    private fb: FormBuilder,
    private sv: ServiceManager,
    private app: AppointmentService,
    private infoManager: InfoManager,
    private toast: AlertService,
  ) {
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      phone: [''],
      date: ['', Validators.required],
      time: ['', Validators.required],
      serviceId: [''],
      barberId: [''],
      description: ['']
    });

    this.appointments$ = this.apptSvc.getAppointments().pipe(
      map(list => list.map(a => this.normalize(a)))
    );

    this.filteredForDay$ = combineLatest([this.appointments$, this.selectedDate$]).pipe(
      map(([appointments, date]) => {
        const iso = this.toISODate(date);
        const dayAppointments = appointments
          .filter(a => a.dateISO === iso)
          .sort((x, y) => (x.timeNormalized || '').localeCompare(y.timeNormalized || ''));

        // Actualizar bookedSlots para este día
        this.updateBookedSlotsForDay(iso, dayAppointments);

        return dayAppointments;
      })
    );

    this.selectedAppointment$ = combineLatest([this.appointments$, this.selectedAppointmentId$]).pipe(
      map(([appointments, id]) => {
        if (!appointments || appointments.length === 0 || !id) return null;
        return appointments.find(a => a.id === id) || null;
      })
    );

    // Suscribirse a cambios de fecha para regenerar horas
    this.selectedDate$.subscribe(() => {
      this.generateHoursForSelectedDate();
    });
  }

  private updateBookedSlotsForDay(dateKey: string, appointments: Appointment[]) {
    const bookedSlots: string[] = [];

    appointments.forEach(appointment => {
      if (!appointment.timeNormalized || appointment.timeNormalized === '—') return;

      const timeSegments = this.getAppointmentTimeSegments(appointment);

      timeSegments.forEach(segment => {
        // Generar todos los slots de 30 minutos que ocupa este segmento
        for (let minutes = segment.start; minutes < segment.start + segment.duration; minutes += 30) {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          const timeSlot = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

          // Solo marcar como ocupados los slots activos (no los breaks)
          if (segment.type === 'active') {
            bookedSlots.push(timeSlot);
          }
        }
      });
    });

    this.bookedSlotsByDate[dateKey] = bookedSlots;
  }

  // Método helper para convertir tiempo a minutos
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  // Nuevo método para generar horas basado en schedule y exceptions
  private generateHoursForSelectedDate(): void {
    if (!this.schedule || this.schedule.length === 0) {
      this.hours = this.generateDefaultHours();
      return;
    }

    const selectedDate = this.selectedDate$.value;
    const dateKey = this.toISODate(selectedDate);
    const bookedHours = this.bookedSlotsByDate[dateKey] || [];
    this.hours = this.getAvailableHoursForDate(selectedDate, bookedHours);
  }


  private getAvailableHoursForDate(date: Date, booked: string[]): string[] {
    const dateKey = this.toISODate(date);

    // Verificar si hay una excepción para esta fecha (PRIORIDAD)
    const exception = this.exceptions.find(ex => ex.date === dateKey);

    let hours: string[] = [];

    if (exception) {
      // Usar horarios de la excepción
      if (!exception.closed && exception.intervals) {
        exception.intervals.forEach(interval => {
          hours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    } else {
      // Usar horario semanal normal
      const dayName = this.getDayName(date);
      const daySchedule = this.schedule.find(day => day.day === dayName);

      if (daySchedule && !daySchedule.closed && daySchedule.intervals) {
        daySchedule.intervals.forEach(interval => {
          hours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    }

    // Incluir tanto las horas disponibles como las ocupadas para mostrar en el calendario
    const allPossibleHours = [...new Set([...hours, ...booked])];
    return allPossibleHours.sort();
  }

  private getDayName(date: Date): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[date.getDay()];
  }

  private hoursRangeFromOpenClose(open: string, close: string, step = 30): string[] {
    if (!open || !close) return [];
    const result: string[] = [];
    const [openH, openM] = open.split(':').map(Number);
    const [closeH, closeM] = close.split(':').map(Number);

    let hour = openH;
    let minute = openM;
    while (hour < closeH || (hour === closeH && minute < closeM)) {
      result.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
      minute += step;
      if (minute >= 60) {
        minute = 0;
        hour++;
      }
    }

    return result;
  }

  // Método de fallback (el original)
  private generateDefaultHours(): string[] {
    const hours: string[] = [];
    for (let h = 8; h <= 20; h++) {
      hours.push(this.pad(h) + ':00');
      hours.push(this.pad(h) + ':30');
    }
    return hours;
  }

  async ngAfterViewInit() {
    // Cargar datos de horario y excepciones desde InfoManager
    try {
      this.schedule = await this.infoManager.getSchedule();
      this.exceptions = await this.infoManager.getExceptions();
      this.generateHoursForSelectedDate(); // Regenerar horas con los datos cargados

      // Cargar configuración de selección de peluqueros
      const barberSettings = await this.infoManager.getBarberSettings();
      this.barberSelectionEnabled = barberSettings?.settings?.barberSelection ?? false;
      await this.loadBarbers();

      console.log('Datos cargados en appointment-management:', {
        schedule: this.schedule,
        exceptions: this.exceptions
      });
    } catch (error) {
      console.error('Error cargando datos de horario:', error);
      this.hours = this.generateDefaultHours(); // Fallback
    }

    // Cargar servicios
    this.services = await this.sv.getServicesDirectly();

    // Observar cambios en la cita seleccionada Y que esté en el día actual para hacer scroll
    combineLatest([this.selectedAppointment$, this.filteredForDay$]).subscribe(([appointment, dayList]) => {
      if (appointment && appointment.timeNormalized && dayList.some(a => a.id === appointment.id)) {
        this.scrollToAppointment(appointment.timeNormalized);
      }
    });
  }

  ngOnDestroy(): void {
    this.selectedDate$.complete();
    this.selectedAppointmentId$.complete();
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  private async loadBarbers(): Promise<void> {
    try {
      const barberSettings = await this.infoManager.getBarberSettings();
      if (Array.isArray(barberSettings?.settings.staff)) {
        this.barbers = barberSettings.settings.staff.filter((barber: Barber) => barber.visible);
      } else {
        this.barbers = [];
      }
    } catch (error) {
      console.error('Error cargando peluqueros:', error);
      this.barbers = [];
    }
  }


  // NUEVA LÓGICA: Verificar si un servicio puede ser programado en un horario específico
  async canScheduleService(
    date: Date,
    time: string,
    service: Service | null,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    if (!service || !service.timeSegments) return true;

    const dateKey = this.toISODate(date);
    const startMinutes = this.timeToMinutes(time);

    // Calcular todos los slots que ocupará el servicio
    const serviceSlots: number[] = [];
    let currentTime = startMinutes;

    service.timeSegments.forEach((segment, index) => {
      // Slots del servicio activo
      for (let i = 0; i < segment.duration; i += 30) {
        serviceSlots.push(currentTime + i);
      }
      currentTime += segment.duration;

      // Slots del break (si existe y no es el último segmento)
      if (segment.breakAfter && segment.breakAfter > 0 && index < service.timeSegments.length - 1) {
        for (let i = 0; i < segment.breakAfter; i += 30) {
          serviceSlots.push(currentTime + i);
        }
        currentTime += segment.breakAfter;
      }
    });

    // Verificar que no se sobreponga con horarios de cierre
    const endTime = Math.max(...serviceSlots) + 30; // +30 porque cada slot es de 30 min
    if (!this.isTimeWithinSchedule(date, endTime)) return false;

    // Obtener las citas del día desde el observable
    const resolvedAppointments = await firstValueFrom(this.appointments$);

    for (const appointment of resolvedAppointments) {
      if (!appointment.timeNormalized || appointment.id === excludeAppointmentId) continue;

      const appointmentSegments = this.getAppointmentTimeSegments(appointment);
      const occupiedSlots: number[] = [];

      appointmentSegments.forEach(segment => {
        for (let i = 0; i < segment.duration; i += 30) {
          occupiedSlots.push(segment.start + i);
        }
      });

      // Verificar solapamiento
      const hasOverlap = serviceSlots.some(slot => occupiedSlots.includes(slot));
      if (hasOverlap) return false;
    }

    return true;
  }

  private isTimeWithinSchedule(date: Date, endTimeMinutes: number): boolean {
    const dateKey = this.toISODate(date);
    const exception = this.exceptions.find(ex => ex.date === dateKey);

    let intervals: {open: string, close: string}[] = [];

    if (exception) {
      if (exception.closed) return false;
      intervals = exception.intervals || [];
    } else {
      const dayName = this.getDayName(date);
      const daySchedule = this.schedule.find(day => day.day === dayName);
      if (!daySchedule || daySchedule.closed) return false;
      intervals = daySchedule.intervals || [];
    }

    // Verificar que el tiempo final esté dentro de algún intervalo
    return intervals.some(interval => {
      const closeMinutes = this.timeToMinutes(interval.close);
      return endTimeMinutes <= closeMinutes;
    });
  }

  private async getAppointmentsForDate(dateKey: string, excludeId?: string): Promise<Appointment[]> {
    const appts = await firstValueFrom(this.appointments$);
    return appts.filter(a => a.dateISO === dateKey && (excludeId ? a.id !== excludeId : true));
  }

  // Método mejorado para determinar si una hora está disponible
  isHourAvailable(hour: string): boolean {
    if (!this.schedule || this.schedule.length === 0) return true;

    const selectedDate = this.selectedDate$.value;
    const dateKey = this.toISODate(selectedDate);

    // Verificar si el slot ya está ocupado por una cita activa
    const bookedSlots = this.bookedSlotsByDate[dateKey] || [];
    if (bookedSlots.includes(hour)) {
      return false;
    }

    // Verificar si hay una excepción para esta fecha (PRIORIDAD)
    const exception = this.exceptions.find(ex => ex.date === dateKey);

    let availableHours: string[] = [];

    if (exception) {
      if (exception.closed) return false;
      if (exception.intervals) {
        exception.intervals.forEach(interval => {
          availableHours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    } else {
      const dayName = this.getDayName(selectedDate);
      const daySchedule = this.schedule.find(day => day.day === dayName);

      if (!daySchedule || daySchedule.closed) return false;
      if (daySchedule.intervals) {
        daySchedule.intervals.forEach(interval => {
          availableHours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    }

    return availableHours.includes(hour);
  }

  // Verifica si es un slot de continuación de una cita
  isAppointmentContinuation(dayList: Appointment[], hour: string): boolean {
    const appointment = this.findReservation(dayList, hour);
    return appointment ? !this.isMainAppointmentSlot(dayList, hour, appointment) : false;
  }

  // Método para verificar si es el inicio de un segmento activo
  isAppointmentStart(dayList: Appointment[], hour: string): boolean {
    const appointment = this.findReservation(dayList, hour);
    return appointment ? this.getSlotType(dayList, hour, appointment) === 'start' : false;
  }

  // Método para verificar si es el final de la cita
  isAppointmentEnd(dayList: Appointment[], hour: string): boolean {
    const appointment = this.findReservation(dayList, hour);
    return appointment ? this.getSlotType(dayList, hour, appointment) === 'end' : false;
  }

  isBreakSlot(dayList: Appointment[], hour: string): boolean {
    return this.findBreakSlot(dayList, hour) !== undefined;
  }

  // Obtiene el número de slots que ocupa una cita
  getAppointmentSlotCount(appointment: Appointment): number {
    const timeSegments = this.getAppointmentTimeSegments(appointment);
    let totalSlots = 0;

    timeSegments.forEach(segment => {
      totalSlots += Math.ceil(segment.duration / 30);
    });

    return totalSlots;
  }

  // Verifica si una cita es de múltiples slots
  isMultiSlotAppointment(appointment: Appointment): boolean {
    return this.getAppointmentSlotCount(appointment) > 1;
  }

  startCreateFromSlot(timeSlot: string) {
    this.isCreating = true;
    this.isEditing = false;
    this.editedAppointment = null;

    const selectedDate = this.selectedDate$.value;
    const formattedDate = this.toISODate(selectedDate);

    this.editForm.reset();
    this.editForm.patchValue({
      date: formattedDate,
      time: timeSlot
    });
  }

  startEdit(appointment: Appointment) {
    this.isEditing = true;
    this.isCreating = false;
    this.editedAppointment = { ...appointment };
    this.selectedAppointmentId$.next(appointment.id || null);
    this.editForm.patchValue({
      name: appointment.name || '',
      phone: appointment.phone || '',
      date: appointment.date || '',
      time: appointment.time || '',
      serviceId: appointment.service?.name || '',
      barberId: appointment.barber || '',
      description: appointment.description || ''
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.isCreating = false;
    this.editedAppointment = null;
  }

  // Validar servicio antes de guardar
  validateServiceScheduling(): boolean {
    const formData = this.editForm.value;
    if (!formData.serviceId || !formData.date || !formData.time) return true;

    const service = this.services.find(s => s.name === formData.serviceId);
    const date = new Date(formData.date);
    const excludeId = this.isEditing && this.editedAppointment ? this.editedAppointment.id : undefined;

    if (!this.canScheduleService(date, formData.time, service ?? null, excludeId)) {
      this.toast.error('El servicio seleccionado no se puede programar en este horario. Verifique disponibilidad y horarios de cierre.');
      return false;
    }

    return true;
  }

  async saveEdit() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    if (!this.validateServiceScheduling()) return;

    this.isSaving = true;
    try {
      const formData = this.editForm.value;
      const serviceInstance = this.services.find(s => s.name === formData.serviceId);

      // Convertimos a DTO plano
      const serviceDTO: ServiceDTO | undefined = serviceInstance?.toJson();

      const appointmentFirestore: AppointmentFirestore = {
        name: formData.name,
        phone: formData.phone,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        service: serviceDTO,
        barber: formData.barberId,
        datetime: this.createTimestamp(formData.date, formData.time)
      };

      if (this.isEditing && this.editedAppointment?.id) {
        await this.apptSvc.updateAppointment(this.editedAppointment.id, appointmentFirestore);
        this.toast.success('Cita actualizada correctamente', 0, 'top-center');
      } else {
        await this.apptSvc.addAppointment(appointmentFirestore);
        this.toast.success('Cita creada correctamente', 3000, 'top-center');
      }

      this.isEditing = false;
      this.isCreating = false;
      this.editedAppointment = null;
      this.editForm.reset();

    } catch (error) {
      console.error('Error al guardar la cita:', error);
      const action = this.isEditing ? 'actualizar' : 'crear';
      this.toast.error(`No se pudo ${action} la cita. Por favor, intenta nuevamente.`);
    } finally {
      this.isSaving = false;
    }
  }





  private createTimestamp(dateStr: string, timeStr: string): any {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);

    const date = new Date(year, month - 1, day, hours, minutes);
    return {
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0
    };
  }

  async deleteAppointment(id: string) {
    if (! await this.toast.confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
      return;
    }

    try {
      await this.apptSvc.deleteAppointment(id);

      if (this.isEditing && this.editedAppointment?.id === id) {
        this.cancelEdit();
      }

      this.selectedAppointmentId$.next(null);
      this.toast.success('Cita eliminada correctamente');

    } catch (error) {
      console.error('Error al eliminar la cita:', error);
      this.toast.error('No se pudo eliminar la cita. Por favor, intenta nuevamente.');
    }
  }

  chooseAppointment(id: string | undefined) {
    if (!id) return;

    this.selectedAppointmentId$.next(id);

    combineLatest([this.appointments$]).pipe(
      take(1)
    ).subscribe(([appointments]) => {
      const appointment = appointments.find(a => a.id === id);
      if (appointment && appointment.dateISO) {
        const appointmentDate = this.parseISODate(appointment.dateISO);
        if (appointmentDate && !this.isSameDay(appointmentDate, this.selectedDate$.value)) {
          this.selectedDate$.next(appointmentDate);
        }
      }
    });
  }

  prevDay() {
    const d = this.findPreviousAvailableDay(this.selectedDate$.value);
    this.selectedDate$.next(d);
    this.validateSelectedAppointmentForCurrentDay();
  }

  nextDay() {
    const d = this.findNextAvailableDay(this.selectedDate$.value);
    this.selectedDate$.next(d);
    this.validateSelectedAppointmentForCurrentDay();
  }

  // Nuevos métodos de navegación
  prevWeek() {
    const d = new Date(this.selectedDate$.value.getTime() - 7 * 24 * 3600 * 1000);
    // Buscar el primer día disponible en esa semana o anteriores
    const availableDay = this.findNearestAvailableDay(d, false);
    this.selectedDate$.next(availableDay);
    this.validateSelectedAppointmentForCurrentDay();
  }

  nextWeek() {
    const d = new Date(this.selectedDate$.value.getTime() + 7 * 24 * 3600 * 1000);
    // Buscar el primer día disponible en esa semana o posteriores
    const availableDay = this.findNearestAvailableDay(d, true);
    this.selectedDate$.next(availableDay);
    this.validateSelectedAppointmentForCurrentDay();
  }

  prevMonth() {
    const currentDate = this.selectedDate$.value;
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
    // Si el día no existe en el mes anterior (ej: 31 de marzo -> 28 de febrero), usar el último día del mes
    if (d.getMonth() !== (currentDate.getMonth() - 1 + 12) % 12) {
      d.setDate(0); // Ir al último día del mes anterior
    }
    const availableDay = this.findNearestAvailableDay(d, true);
    this.selectedDate$.next(availableDay);
    this.validateSelectedAppointmentForCurrentDay();
  }

  nextMonth() {
    const currentDate = this.selectedDate$.value;
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate());
    // Si el día no existe en el mes siguiente (ej: 31 de enero -> 28 de febrero), usar el último día del mes
    if (d.getMonth() !== (currentDate.getMonth() + 1) % 12) {
      d.setDate(0); // Ir al último día del mes
    }
    const availableDay = this.findNearestAvailableDay(d, true);
    this.selectedDate$.next(availableDay);
    this.validateSelectedAppointmentForCurrentDay();
  }

  // Métodos auxiliares para encontrar días disponibles
  private findNextAvailableDay(startDate: Date): Date {
    let currentDate = new Date(startDate.getTime() + 24 * 3600 * 1000); // Día siguiente
    let attempts = 0;
    const maxAttempts = 365; // Evitar bucle infinito

    while (attempts < maxAttempts) {
      if (this.isDayAvailable(currentDate)) {
        return currentDate;
      }
      currentDate = new Date(currentDate.getTime() + 24 * 3600 * 1000);
      attempts++;
    }

    // Fallback: devolver el día original + 1 si no se encuentra nada
    return new Date(startDate.getTime() + 24 * 3600 * 1000);
  }

  private findPreviousAvailableDay(startDate: Date): Date {
    let currentDate = new Date(startDate.getTime() - 24 * 3600 * 1000); // Día anterior
    let attempts = 0;
    const maxAttempts = 365; // Evitar bucle infinito

    while (attempts < maxAttempts) {
      if (this.isDayAvailable(currentDate)) {
        return currentDate;
      }
      currentDate = new Date(currentDate.getTime() - 24 * 3600 * 1000);
      attempts++;
    }

    // Fallback: devolver el día original - 1 si no se encuentra nada
    return new Date(startDate.getTime() - 24 * 3600 * 1000);
  }

  private findNearestAvailableDay(startDate: Date, searchForward: boolean = true): Date {
    if (this.isDayAvailable(startDate)) {
      return startDate;
    }

    if (searchForward) {
      return this.findNextAvailableDay(new Date(startDate.getTime() - 24 * 3600 * 1000));
    } else {
      return this.findPreviousAvailableDay(new Date(startDate.getTime() + 24 * 3600 * 1000));
    }
  }

  private isDayAvailable(date: Date): boolean {
    if (!this.schedule || this.schedule.length === 0) return true; // Si no hay datos, asumir disponible

    const dateKey = this.toISODate(date);

    // Verificar si hay una excepción para esta fecha (PRIORIDAD)
    const exception = this.exceptions.find(ex => ex.date === dateKey);

    if (exception) {
      // Si hay excepción específica para este día
      return !exception.closed && exception.intervals && exception.intervals.length > 0;
    } else {
      // Usar horario por defecto según el día de la semana
      const dayName = this.getDayName(date);
      const daySchedule = this.schedule.find(day => day.day === dayName);
      return !!(daySchedule && !daySchedule.closed && daySchedule.intervals && daySchedule.intervals.length > 0);
    }
  }

  private async validateSelectedAppointmentForCurrentDay() {
    const selectedId = this.selectedAppointmentId$.value;
    if (!selectedId) return;

    const dayAppointments = await firstValueFrom(this.filteredForDay$);
    const exists = dayAppointments.some(a => a.id === selectedId);
    if (!exists) this.selectedAppointmentId$.next(null);
  }


  private scrollToAppointment(timeNormalized: string) {
    if (!this.calendarBody || !this.calendarBody.nativeElement) return;

    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);

    this.scrollTimeout = setTimeout(() => {
      if (!this.calendarBody?.nativeElement) return;

      const hourToFind = this.extractHourFromTime(timeNormalized);
      const hourElement = this.calendarBody.nativeElement.querySelector(`[data-hour="${hourToFind}"]`) as HTMLElement;

      if (hourElement) {
        hourElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        this.highlightAppointment(hourElement);
      }
    }, 100);
  }

  private highlightAppointment(element: HTMLElement) {
    const reservation = element.querySelector('.reservation') as HTMLElement;
    if (reservation) {
      reservation.classList.add('highlighted');
      setTimeout(() => reservation.classList.remove('highlighted'), 2000);
    }
  }

  private extractHourFromTime(time: string): string {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const minNum = parseInt(minute) || 0;
    return `${this.pad(hourNum)}:${minNum >= 30 ? '30' : '00'}`;
  }

  private parseISODate(isoDate: string): Date | null {
    const parts = isoDate.split('-');
    return parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : null;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private normalize(a: Appointment): Appointment {
    const out: Appointment = { ...a };

    if (typeof a.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.date)) {
      out.dateISO = a.date;
    } else if (a.datetime?.seconds) {
      out.dateISO = this.toISODate(new Date(a.datetime.seconds * 1000));
    } else if (a.createdAt?.seconds) {
      out.dateISO = this.toISODate(new Date(a.createdAt.seconds * 1000));
    }

    if (a.time) {
      out.timeNormalized = a.time;
    } else if (a.datetime?.seconds) {
      const d = new Date(a.datetime.seconds * 1000);
      out.timeNormalized = this.pad(d.getHours()) + ':' + this.pad(d.getMinutes());
    } else {
      out.timeNormalized = '—';
    }

    return out;
  }


  toISODate(d: Date) {
    return d.getFullYear() + '-' + this.pad(d.getMonth() + 1) + '-' + this.pad(d.getDate());
  }

  private pad(n: number) {
    return n < 10 ? '0' + n : '' + n;
  }

  findReservation(list: Appointment[], hour: string): Appointment | undefined {
    return list.find(a => {
      if (!a.timeNormalized) return false;
      const slotMinutes = this.timeToMinutes(hour.substring(0, 5));
      const activeSegments = this.getActiveTimeSegments(a);
      return activeSegments.some(segment =>
        slotMinutes >= segment.start && slotMinutes < (segment.start + segment.duration)
      );
    });
  }

  formatDateHeader(d: Date) {
    return d.toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  getAppointmentDuration(appointment: Appointment): string {
    if (appointment.service?.timeSegments) {
      const totalTime = appointment.service.timeSegments.reduce((total, segment) =>
        total + segment.duration + (segment.breakAfter || 0), 0);
      return `${totalTime}min`;
    }
    return '30min';
  }

  goToToday() {
    this.selectedDate$.next(new Date());
    this.selectedAppointmentId$.next(null);
  }

  getAppointmentTimeSegments(appointment: Appointment): { start: number, duration: number, type: 'active' | 'break' }[] {
    if (!appointment.timeNormalized) return [];

    const startMinutes = this.timeToMinutes(appointment.timeNormalized);
    const segments: { start: number, duration: number, type: 'active' | 'break' }[] = [];

    if (appointment.service?.timeSegments) {
      let currentTime = startMinutes;

      appointment.service.timeSegments.forEach((segment, index) => {
        segments.push({ start: currentTime, duration: segment.duration, type: 'active' });
        currentTime += segment.duration;

        if (segment.breakAfter && segment.breakAfter > 0 && index < appointment.service!.timeSegments.length - 1) {
          segments.push({ start: currentTime, duration: segment.breakAfter, type: 'break' });
          currentTime += segment.breakAfter;
        }
      });
    }
    return segments;
  }

  getSlotType(dayList: Appointment[], hour: string, appointment: Appointment): 'start' | 'active' | 'break' | 'end' {
    if (!appointment.timeNormalized) return 'active';

    const slotMinutes = this.timeToMinutes(hour.substring(0, 5));
    const timeSegments = this.getAppointmentTimeSegments(appointment);

    for (let i = 0; i < timeSegments.length; i++) {
      const segment = timeSegments[i];
      const segmentEnd = segment.start + segment.duration;

      if (slotMinutes >= segment.start && slotMinutes < segmentEnd) {
        if (i === 0 && slotMinutes === segment.start) return 'start';
        if (i === timeSegments.length - 1 && slotMinutes === segmentEnd - 1) return 'end';
        if (segment.type === 'break') return 'break';
        return 'active';
      }
    }
    return 'active';
  }

  isMainAppointmentSlot(dayList: Appointment[], hour: string, appointment: Appointment): boolean {
    return appointment.timeNormalized === hour.substring(0, 5);
  }

  getServiceDuration(service: Service) {
    return service.timeSegments.reduce((total, segment) =>
      total + segment.duration + (segment.breakAfter || 0), 0);
  }

  getActiveTimeSegments(appointment: Appointment): { start: number, duration: number }[] {
    if (!appointment.timeNormalized || !appointment.service?.timeSegments) return [];

    const startMinutes = this.timeToMinutes(appointment.timeNormalized);
    const segments: { start: number, duration: number }[] = [];
    let currentTime = startMinutes;

    appointment.service.timeSegments.forEach(segment => {
      segments.push({ start: currentTime, duration: segment.duration });
      currentTime += segment.duration + (segment.breakAfter || 0);
    });

    return segments;
  }

  getBreakSegments(appointment: Appointment): { start: number, duration: number, belongsTo: Appointment }[] {
    if (!appointment.timeNormalized || !appointment.service?.timeSegments) return [];

    const breaks: { start: number, duration: number, belongsTo: Appointment }[] = [];
    let currentTime = this.timeToMinutes(appointment.timeNormalized);

    appointment.service.timeSegments.forEach((segment, index) => {
      currentTime += segment.duration;
      if (segment.breakAfter && segment.breakAfter > 0 && index < appointment.service!.timeSegments.length - 1) {
        breaks.push({ start: currentTime, duration: segment.breakAfter, belongsTo: appointment });
        currentTime += segment.breakAfter;
      }
    });

    return breaks;
  }

  getBreakInfo(dayList: Appointment[], hour: string): { appointment: Appointment, breakInfo: any } | undefined {
    return this.findBreakSlot(dayList, hour);
  }

  findBreakSlot(list: Appointment[], hour: string): { appointment: Appointment, breakInfo: any } | undefined {
    const slotMinutes = this.timeToMinutes(hour.substring(0, 5));

    for (const appointment of list) {
      const breakSegments = this.getBreakSegments(appointment);
      const breakSegment = breakSegments.find(brk =>
        slotMinutes >= brk.start && slotMinutes < (brk.start + brk.duration)
      );

      if (breakSegment) {
        return { appointment, breakInfo: breakSegment };
      }
    }
    return undefined;
  }

  isConnectedToPrevious(appointment: Appointment, hour: string): boolean {
    const slotMinutes = this.timeToMinutes(hour.substring(0, 5));
    const activeSegments = this.getActiveTimeSegments(appointment);
    return activeSegments.some(segment => (segment.start + segment.duration) === slotMinutes);
  }

  isConnectedToNext(appointment: Appointment, hour: string): boolean {
    const slotMinutes = this.timeToMinutes(hour.substring(0, 5));
    const breakInfo = this.getBreakInfo([appointment], hour);

    if (!breakInfo) return false;

    const nextSegmentStart = breakInfo.breakInfo.start + breakInfo.breakInfo.duration;
    const activeSegments = this.getActiveTimeSegments(appointment);
    return activeSegments.some(segment => segment.start === nextSegmentStart);
  }
}
