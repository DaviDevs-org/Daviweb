import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject, OnInit, PLATFORM_ID, OnDestroy, AfterViewInit, ViewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AppointmentService } from '../../../services/appointments.service';
import { isPlatformBrowser, NgForOf, NgIf } from '@angular/common';
import {
  Barber,
  Service,
  ScheduleDay,
  ExceptionItem,
  Appointment,
  NewService, TimeSegment
} from '../../../admin-panel/types/admin.types';
import { ServiceManager } from '../../../services/admin-panel/services-management.service';
import { AlertService } from '../../../services/alert/alert.service';
import { InfoManager } from '../../../services/admin-panel/info-management.service';
import { AppointmentManagerService } from '../../../services/admin-panel/appointment-management.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { RouterLink } from '@angular/router';
import { BookingPreselectionService } from '../../../services/booking-preselection.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [FormsModule, NgIf, NgForOf, RouterLink],
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.scss']
})
export class BookingFormComponent implements OnChanges, OnInit, OnDestroy, AfterViewInit {

  @Input() date?: string | null = null;
  @Input() time?: string | null = null;

  @Input() barbers: Barber[] = [];
  @Input() allowBarberSelection: boolean = false;

  @ViewChild('bookingForm') bookingFormRef?: NgForm;

  private sv = inject(ServiceManager);
  private toast = inject(AlertService);
  private infoManager = inject(InfoManager);
  private apptSvc = inject(AppointmentManagerService);
  private platformId = inject(PLATFORM_ID);
  private preselectionService = inject(BookingPreselectionService);

  @Output() formSubmitted = new EventEmitter<{
    name: string;
    phone: string;
    description?: string;
    barber?: string;
    service: Service;
    hairLength?: 'short' | 'medium' | 'long' | null;
  }>();

  submitted = false;
  formRef?: NgForm;
  submitting = false;
  services: Service[] = [];
  availableServices: Service[] = [];
  hairLengthSelection: 'short' | 'medium' | 'long' | null = null;

  private preselectionSubscription?: Subscription;

  // Datos de horarios para validación
  schedule: ScheduleDay[] = [];
  exceptions: ExceptionItem[] = [];
  existingAppointments: Appointment[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['date']) {
      this.updateAvailableServices();
    }
    if (changes['time']) {
      this.updateAvailableServices();
    }
    if (changes['barbers']) {
    }
  }

  async ngOnInit(): Promise<void> {
    this.services = await this.sv.getServicesDirectly();

    // Cargar datos de horarios para validación
    try {
      this.schedule = await this.infoManager.getSchedule();
      this.exceptions = await this.infoManager.getExceptions();

      // Cargar citas existentes
      await this.loadExistingAppointments();

      this.updateAvailableServices();
    } catch (error) {
      console.error('Error cargando horarios:', error);
    }
  }

  ngAfterViewInit(): void {
    // Suscribirse a las preselecciones después de que la vista esté lista
    setTimeout(() => {
      this.preselectionSubscription = this.preselectionService.preselection$.subscribe(preselection => {
        this.applyPreselection(preselection);
      });

      // Aplicar preselección inicial si existe
      const initialPreselection = this.preselectionService.getPreselection();
      this.applyPreselection(initialPreselection);
    }, 0);
  }

  private applyPreselection(preselection: any): void {
    if (!this.bookingFormRef) return;

    if (preselection.serviceName) {
      const serviceControl = this.bookingFormRef.controls['service'];
      if (serviceControl) {
        serviceControl.setValue(preselection.serviceName);
        serviceControl.markAsTouched();
      }
    }

    if (preselection.barberName && this.allowBarberSelection) {
      const barberControl = this.bookingFormRef.controls['barber'];
      if (barberControl) {
        barberControl.setValue(preselection.barberName);
        barberControl.markAsTouched();
      }
    }
  }

  ngOnDestroy(): void {
    this.preselectionSubscription?.unsubscribe();
  }

  private async loadExistingAppointments(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)){
      this.existingAppointments = []
      return
    }
    try {
      const appointments$ = this.apptSvc.getAppointments().pipe(
        map(list => list.map(a => this.normalizeAppointment(a)))
      );
      this.existingAppointments = await firstValueFrom(appointments$);
    } catch (error) {
      console.error('Error cargando citas existentes:', error);
      this.existingAppointments = [];
    }
  }

  private normalizeAppointment(a: Appointment): Appointment {
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

  private toISODate(d: Date): string {
    return d.getFullYear() + '-' + this.pad(d.getMonth() + 1) + '-' + this.pad(d.getDate());
  }

  private pad(n: number): string {
    return n < 10 ? '0' + n : '' + n;
  }

  private async updateAvailableServices(): Promise<void> {
    if (!this.date || !this.time || !this.services.length) {
      this.availableServices = [...this.services];
      return;
    }

    const selectedDate = this.parseDate(this.date);
    if (!selectedDate) {
      this.availableServices = [...this.services];
      return;
    }

    // Recargar citas existentes cuando cambie la fecha para tener datos actualizados
    await this.loadExistingAppointments();

    this.availableServices = this.services.filter(service =>
      this.canScheduleService(selectedDate, this.time!, service)
    );
  }

  private parseDate(dateStr: string): Date | null {
    const parts = dateStr.split('-');
    return parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : null;
  }

  private canScheduleService(date: Date, time: string, service: Service): boolean {
    const effService = (service.requiresHairLength && this.hairLengthSelection)
      ? service.materializeForLength(this.hairLengthSelection)
      : service;

    const startMinutes = this.timeToMinutes(time);
    // Si el servicio tiene limitador horario, verificar que la hora de inicio caiga dentro
    if (service.hourRange?.start && service.hourRange?.end) {
      const s = this.timeToMinutes(service.hourRange.start);
      const e = this.timeToMinutes(service.hourRange.end);
      if (!(startMinutes >= s && startMinutes < e)) return false;
    }
    if (!effService.timeSegments || effService.timeSegments.length === 0) {
      // Servicio sin timeSegments, asumir duración por defecto de 30 minutos
      const endTimeMinutes = startMinutes + 30;
      // Verificar fin dentro del rango horario del servicio (si existe)
      if (service.hourRange?.start && service.hourRange?.end) {
        const e = this.timeToMinutes(service.hourRange.end);
        if (endTimeMinutes > e) return false;
      }
      if (!this.isRangeWithinSchedule(date, startMinutes, endTimeMinutes)) return false;
      return !this.hasCollisionWithExistingAppointments(date, startMinutes, 30);
    }

  const dateKey = this.formatDate(date);

    // Calcular todos los slots que ocupará el servicio
    const serviceSlots: number[] = [];
    let currentTime = startMinutes;

  effService.timeSegments.forEach((segment, index) => {
      // Slots del servicio activo
      for (let i = 0; i < segment.duration; i += 30) {
        serviceSlots.push(currentTime + i);
      }
      currentTime += segment.duration;

      // Slots del break (si existe y no es el último segmento)
  if (segment.breakAfter && segment.breakAfter > 0 && index < effService.timeSegments.length - 1) {
        for (let i = 0; i < segment.breakAfter; i += 30) {
          serviceSlots.push(currentTime + i);
        }
        currentTime += segment.breakAfter;
      }
    });

    // Calcular fin exacto (segmentos + breaks intermedios) y verificar que cabe en un intervalo abierto
    let endExact = startMinutes;
    effService.timeSegments.forEach((segment, index) => {
      endExact += segment.duration;
      if (segment.breakAfter && segment.breakAfter > 0 && index < effService.timeSegments.length - 1) {
        endExact += segment.breakAfter;
      }
    });
    // Validar que el servicio cabe en el rango general del local
    if (!this.isRangeWithinSchedule(date, startMinutes, endExact)) return false;
    // Validar que el servicio cabe en el rango horario del propio servicio (si existe)
    if (service.hourRange?.start && service.hourRange?.end) {
      const s = this.timeToMinutes(service.hourRange.start);
      const e = this.timeToMinutes(service.hourRange.end);
      if (!(startMinutes >= s && endExact <= e)) return false;
    }

    // Verificar que no se sobreponga con otras citas
    const dayAppointments = this.getAppointmentsForDate(dateKey);

    for (const appointment of dayAppointments) {
      if (!appointment.timeNormalized || appointment.timeNormalized === '—') continue;

      const appointmentSegments = this.getAppointmentTimeSegments(appointment);
      const occupiedSlots: number[] = [];

      appointmentSegments.forEach(segment => {
        // Solo verificar colisión con segmentos ACTIVOS, no con breaks
        if (segment.type === 'active') {
          for (let i = 0; i < segment.duration; i += 30) {
            occupiedSlots.push(segment.start + i);
          }
        }
      });

      // Verificar solapamiento solo con slots activos del nuevo servicio
  const activeServiceSlots = this.getActiveServiceSlots(effService, startMinutes);
      const hasOverlap = activeServiceSlots.some(slot => occupiedSlots.includes(slot));
      if (hasOverlap) {
        return false;
      }
    }

    return true;
  }

  // Verifica que [start, end) esté completamente dentro de un único intervalo abierto del día
  private isRangeWithinSchedule(date: Date, startMinutes: number, endMinutes: number): boolean {
    const dateKey = this.formatDate(date);
    const exception = this.exceptions.find(ex => ex.date === dateKey);

    let intervals: {open: string; close: string}[] = [];
    if (exception) {
      if (exception.closed) return false;
      intervals = exception.intervals || [];
    } else {
      const dayName = this.getDayName(date);
      const daySchedule = this.schedule.find(day => day.day === dayName);
      if (!daySchedule || daySchedule.closed) return false;
      intervals = daySchedule.intervals || [];
    }

    return intervals.some(interval => {
      const openM = this.timeToMinutes(interval.open);
      const closeM = this.timeToMinutes(interval.close);
      return startMinutes >= openM && endMinutes <= closeM;
    });
  }

  get privacyConsentInvalid(): boolean {
    const consent = this.formRef?.controls['privacyConsent']?.value;
    return this.submitted && !consent;
  }

  private getActiveServiceSlots(service: Service, startMinutes: number): number[] {
    const activeSlots: number[] = [];
    let currentTime = startMinutes;

    service.timeSegments.forEach((segment, index) => {
      // Solo agregar slots activos, no breaks
      for (let i = 0; i < segment.duration; i += 30) {
        activeSlots.push(currentTime + i);
      }
      currentTime += segment.duration;

      // Saltar el break pero no agregarlo a activeSlots
      if (segment.breakAfter && segment.breakAfter > 0 && index < service.timeSegments.length - 1) {
        currentTime += segment.breakAfter;
      }
    });

    return activeSlots;
  }

  private hasCollisionWithExistingAppointments(date: Date, startMinutes: number, duration: number): boolean {
    const dateKey = this.formatDate(date);
    const dayAppointments = this.getAppointmentsForDate(dateKey);

    const newAppointmentSlots: number[] = [];
    for (let i = 0; i < duration; i += 30) {
      newAppointmentSlots.push(startMinutes + i);
    }

    for (const appointment of dayAppointments) {
      if (!appointment.timeNormalized || appointment.timeNormalized === '—') continue;

      const appointmentSegments = this.getAppointmentTimeSegments(appointment);
      const occupiedSlots: number[] = [];

      appointmentSegments.forEach(segment => {
        if (segment.type === 'active') {
          for (let i = 0; i < segment.duration; i += 30) {
            occupiedSlots.push(segment.start + i);
          }
        }
      });

      const hasOverlap = newAppointmentSlots.some(slot => occupiedSlots.includes(slot));
      if (hasOverlap) {
        return true;
      }
    }

    return false;
  }

  private getAppointmentsForDate(dateKey: string): Appointment[] {
    return this.existingAppointments.filter(a => a.dateISO === dateKey);
  }

  private getAppointmentTimeSegments(appointment: Appointment): { start: number; duration: number; type: 'active' | 'break' }[] {
    if (!appointment.timeNormalized || appointment.timeNormalized === '—') return [];

    const startMinutes = this.timeToMinutes(appointment.timeNormalized);
    const segments: { start: number; duration: number; type: 'active' | 'break' }[] = [];

    const svc = appointment.service as any;
    if (!svc) return [];

    const materialize = (s: any, length?: 'short' | 'medium' | 'long') => {
      if (!s?.requiresHairLength || !length) return s;
      const mod = s.hairLengthModifiers?.[length];
      if (!mod) return s;
      const segs = (mod.segments && mod.segments.length > 0)
        ? mod.segments
        : (mod.time && mod.time > 0 ? [{ duration: mod.time, breakAfter: 0 }] : []);
      return { ...s, timeSegments: segs, requiresHairLength: false };
    };

    const concrete = materialize(svc, appointment.hairLengthChoice || undefined);

    if (concrete.timeSegments && concrete.timeSegments.length > 0) {
      let currentTime = startMinutes;
      (concrete.timeSegments as {duration: number; breakAfter?: number}[]).forEach((segment, index) => {
        segments.push({ start: currentTime, duration: segment.duration, type: 'active' });
        currentTime += segment.duration;
        if (segment.breakAfter && segment.breakAfter > 0 && index < concrete.timeSegments.length - 1) {
          segments.push({ start: currentTime, duration: segment.breakAfter, type: 'break' });
          currentTime += segment.breakAfter;
        }
      });
      return segments;
    }

    // Fallback
    segments.push({ start: startMinutes, duration: 30, type: 'active' });

    return segments;
  }

  private isTimeWithinSchedule(date: Date, endTimeMinutes: number): boolean {
    const dateKey = this.formatDate(date);
    const exception = this.exceptions.find(ex => ex.date === dateKey);

    let intervals: {open: string; close: string}[] = [];

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

  private getDayName(date: Date): string {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[date.getDay()];
  }

  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get selectedServiceRequiresHairLength(): boolean {
    const serviceName = this.bookingFormRef?.value?.service;
    if (!serviceName) return false;
    const service = this.services.find(s => s.name === serviceName);
    return !!service?.requiresHairLength;
  }

  getDisplayTime(service: Service | NewService): string {
    // Si tiene segmentos y hairLength
    if (service.requiresHairLength && service.hairLengthModifiers) {
      // Calcula estimated time basado en los modifiers
      const times = [
        service.hairLengthModifiers.short?.time || 0,
        service.hairLengthModifiers.medium?.time || 0,
        service.hairLengthModifiers.long?.time || 0
      ];
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      return minTime === maxTime ? `${minTime} min` : `${minTime} - ${maxTime} min`;
    }

    // Si tiene segmentos y no requiere hairLength
    if (service.timeSegments && service.timeSegments.length > 0) {
      const total = service.timeSegments.reduce(
        (sum, seg) => sum + seg.duration + (seg.breakAfter || 0),
        0
      );
      return `${total} min`;
    }

    // Fallback
    return '30 min';
  }

  onSubmit(form: NgForm): void {
    this.submitted = true;
    this.formRef = form;

    if (this.submitting) {
      this.toast.error('Ya hay un formulario enviándose, inténtelo de nuevo');
      return;
    }

    const phone = form.value.phone?.trim();
    const hasPhone = !!phone;
    const phoneValid = hasPhone ? this.isPhoneValid(phone) : true;

    if (form.controls['name']?.invalid) {
      this.toast.error('El nombre es inválido');
      return;
    }
    if (!hasPhone) {
      this.toast.error('El teléfono es obligatorio');
      return;
    }
    if (!phoneValid) {
      this.toast.error('Introduzca un teléfono válido (9 números)');
      return;
    }
    if (!form.value.service) {
      this.toast.error('Escoja un servicio');
      return;
    }
    if (!form.value.privacyConsent) {
      this.toast.error('Debes aceptar la política de privacidad para enviar la reserva.');
      return;
    }

    const selectedService = this.services.find(s => s.name === form.value.service);
    if (!selectedService) {
      this.toast.error('Error: servicio no encontrado');
      return;
    }

    // Validar hairLength si el servicio lo requiere
    if (selectedService.requiresHairLength && !this.hairLengthSelection) {
      this.toast.error('Debes seleccionar la longitud de pelo (corto, medio o largo) para este servicio.');
      return;
    }

    if (this.date && this.time) {
      const selectedDate = this.parseDate(this.date);
      if (selectedDate && !this.canScheduleService(selectedDate, this.time, selectedService)) {
        this.toast.error('La duración de este servicio es demasiada, colisiona con otra cita ya existente o el cierre del local.');
        return;
      }
    }

    const appointmentData = {
      name: form.value.name.trim(),
      phone: phone,
      description: form.value.description?.trim() || '',
      barber: form.value.barber || '',
      service: selectedService,
      hairLength: this.hairLengthSelection // <-- nuevo campo
    };

    this.submitting = true;
    this.formSubmitted.emit(appointmentData);

    // Limpiar las preselecciones después de enviar el formulario
    this.preselectionService.clearPreselection();
  }


  resetAll(): void {
    if (this.formRef) {
      this.formRef.resetForm();
    }
    this.submitted = false;
    this.hairLengthSelection = null; // limpiar selección de longitud de pelo
    this.preselectionService.clearPreselection(); // limpiar preselección
  }


  isPhoneValid(phone: string): boolean {
    const phoneRegex = /^[0-9]{9}$/;
    return phoneRegex.test(phone);
  }

  get nameInvalid(): boolean {
    const name = this.formRef?.controls['name'];
    return this.submitted && !!name?.invalid;
  }

  get phoneInvalid(): boolean {
    const phone = this.formRef?.controls['phone'];
    const value = phone?.value?.trim();
    return this.submitted && !!value && !this.isPhoneValid(value);
  }

  getTotalTime(segments: TimeSegment[]): number {
    return segments.reduce((total, segment) => total + segment.duration + (segment.breakAfter || 0), 0);
  }

  // Duración por longitud seleccionada (minutos)
  getSelectedLengthTime(length: 'short' | 'medium' | 'long'): number {
    const serviceName = this.bookingFormRef?.value?.service;
    const svc = this.services.find(s => s.name === serviceName);
    if (!svc || !svc.hairLengthModifiers) return 30;

    const mod = svc.hairLengthModifiers[length];
    if (!mod) return 30;

    // Si hay segmentos, sumar duración + breaks
    if (mod.segments && mod.segments.length > 0) {
      return mod.segments.reduce((sum, seg) => sum + seg.duration + (seg.breakAfter || 0), 0);
    }
    // Si no hay segmentos, usar tiempo simple
    if (mod.time && mod.time > 0) return mod.time;

    // Fallback razonable
    return 30;
  }
}
