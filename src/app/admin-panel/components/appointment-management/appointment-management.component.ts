import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentManagerService } from '../../../services/admin-panel/appointment-management.service';
import { Appointment, Service } from '../../types/admin.types';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceManager } from '../../../services/admin-panel/services-management.service';
import { AppointmentService } from '../../../services/appointments.service';
import { InfoManager } from '../../../services/admin-panel/info-management.service';

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

  // Cambios principales: usar datos de disponibilidad dinámicos
  hours: string[] = [];
  availabilityData: any = null;
  bookedSlotsByDate: Record<string, string[]> = {};
  
  private scrollTimeout: any;

  constructor(
    private apptSvc: AppointmentManagerService, 
    private fb: FormBuilder, 
    private sv: ServiceManager, 
    private app: AppointmentService,
    private infoManager: InfoManager // Agregar InfoManager
  ) {
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      email: [''],
      phone: [''],
      date: ['', Validators.required],
      time: ['', Validators.required],
      serviceId: [''],
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

  // Método para actualizar slots ocupados de un día específico
  private updateBookedSlotsForDay(dateKey: string, appointments: Appointment[]) {
    const bookedSlots: string[] = [];
    
    appointments.forEach(appointment => {
      if (!appointment.timeNormalized || appointment.timeNormalized === '—') return;
      
      const startMinutes = this.timeToMinutes(appointment.timeNormalized);
      const duration = appointment.service?.time || 30;
      
      // Generar todos los slots de 30 minutos que ocupa esta cita
      for (let minutes = startMinutes; minutes < startMinutes + duration; minutes += 30) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const timeSlot = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        bookedSlots.push(timeSlot);
      }
    });
    
    this.bookedSlotsByDate[dateKey] = bookedSlots;
  }

  // Método helper para convertir tiempo a minutos
  private timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + (minutes || 0);
  }

  // Nuevo método para generar horas basado en availabilityData
  private generateHoursForSelectedDate() {
    if (!this.availabilityData) {
      this.hours = this.generateDefaultHours(); // Fallback al método anterior
      return;
    }

    const selectedDate = this.selectedDate$.value;
    const dateKey = this.toISODate(selectedDate);
    const bookedHours = this.bookedSlotsByDate[dateKey] || [];
    
    const availableHours = this.getAvailableHoursForDate(selectedDate, bookedHours);
    this.hours = availableHours;
  }

  private getAvailableHoursForDate(date: Date, booked: string[]): string[] {
    const dateKey = this.toISODate(date);
    const ex = this.availabilityData?.exceptions?.[dateKey];

    let hours: string[] = [];

    if (ex) {
      // Si hay una excepción para este día específico
      if (!ex.closed) {
        let intervals: { open: string; close: string }[] = [];
        if (Array.isArray(ex.intervals)) {
          intervals = ex.intervals;
        } else if (Array.isArray(ex.hours)) {
          intervals = ex.hours.map((h: string) => {
            const [open, close] = h.split('-');
            return { open: open || '', close: close || '' };
          });
        }

        intervals.forEach((interval: { open: string; close: string }) => {
          hours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    } else {
      // Usar horario por defecto según el día de la semana
      const dayName = this.getDayName(date);
      const ds = this.availabilityData?.defaultSchedule?.[dayName];
      if (ds && !ds.closed && Array.isArray(ds.intervals)) {
        ds.intervals.forEach((interval: { open: string; close: string }) => {
          hours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    }

    // Incluir tanto las horas disponibles como las ocupadas para mostrar en el calendario
    // pero mantener la lógica existente de findReservation
    const allPossibleHours = [...new Set([...hours, ...booked])];
    return allPossibleHours.sort();
  }

  private getDayName(date: Date): string {
    const dias = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
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
      result.push(`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
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
    // Cargar datos de disponibilidad
    try {
      this.availabilityData = await this.infoManager.getAvailability();
      this.generateHoursForSelectedDate(); // Regenerar horas con los datos cargados
    } catch (error) {
      console.error('Error cargando availability:', error);
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

  // Método mejorado para determinar si una hora está disponible
  isHourAvailable(hour: string): boolean {
    if (!this.availabilityData) return true; // Si no hay datos, asumir disponible

    const selectedDate = this.selectedDate$.value;
    const dateKey = this.toISODate(selectedDate);
    
    // Verificar si el slot ya está ocupado por una cita
    const bookedSlots = this.bookedSlotsByDate[dateKey] || [];
    if (bookedSlots.includes(hour)) return false;

    // Resto de la lógica de disponibilidad existente...
    const ex = this.availabilityData?.exceptions?.[dateKey];

    let availableHours: string[] = [];

    if (ex) {
      if (ex.closed) return false;
      
      let intervals: { open: string; close: string }[] = [];
      if (Array.isArray(ex.intervals)) {
        intervals = ex.intervals;
      } else if (Array.isArray(ex.hours)) {
        intervals = ex.hours.map((h: string) => {
          const [open, close] = h.split('-');
          return { open: open || '', close: close || '' };
        });
      }

      intervals.forEach((interval: { open: string; close: string }) => {
        availableHours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
      });
    } else {
      const dayName = this.getDayName(selectedDate);
      const ds = this.availabilityData?.defaultSchedule?.[dayName];
      if (!ds || ds.closed) return false;

      if (Array.isArray(ds.intervals)) {
        ds.intervals.forEach((interval: { open: string; close: string }) => {
          availableHours.push(...this.hoursRangeFromOpenClose(interval.open, interval.close));
        });
      }
    }

    return availableHours.includes(hour);
  }

  // Métodos helper para multi-slot
  // Verifica si es el slot principal (primer slot) de una cita
  isMainAppointmentSlot(dayList: Appointment[], hour: string, appointment: Appointment): boolean {
    if (!appointment.timeNormalized) return false;
    
    const appointmentStartTime = appointment.timeNormalized;
    const currentSlotTime = hour.substring(0, 5);
    
    return appointmentStartTime === currentSlotTime;
  }

  // Verifica si es un slot de continuación de una cita
  isAppointmentContinuation(dayList: Appointment[], hour: string): boolean {
    const appointment = this.findReservation(dayList, hour);
    return appointment ? !this.isMainAppointmentSlot(dayList, hour, appointment) : false;
  }

  // Verifica si es el primer slot de una cita
  isAppointmentStart(dayList: Appointment[], hour: string): boolean {
    const appointment = this.findReservation(dayList, hour);
    return appointment ? this.isMainAppointmentSlot(dayList, hour, appointment) : false;
  }

  // Verifica si es el último slot de una cita
  isAppointmentEnd(dayList: Appointment[], hour: string): boolean {
    const appointment = this.findReservation(dayList, hour);
    if (!appointment || !appointment.timeNormalized) return false;
    
    const serviceDuration = appointment.service?.time || 30;
    const appointmentStartMinutes = this.timeToMinutes(appointment.timeNormalized);
    const currentSlotMinutes = this.timeToMinutes(hour.substring(0, 5));
    const appointmentEndMinutes = appointmentStartMinutes + serviceDuration;
    
    // Es el último slot si el siguiente slot ya no pertenece a la cita
    const nextSlotMinutes = currentSlotMinutes + 30;
    return nextSlotMinutes >= appointmentEndMinutes;
  }

  // Obtiene el número de slots que ocupa una cita
  getAppointmentSlotCount(appointment: Appointment): number {
    const duration = appointment.service?.time || 30;
    return Math.ceil(duration / 30);
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
      email: appointment.email || '',
      phone: appointment.phone || '',
      date: appointment.date || '',
      time: appointment.time || '',
      serviceId: appointment.service?.name || '',
      description: appointment.description || ''
    });
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
      const service = this.services.find(s => s.name === formData.serviceId);
      
      if (this.isEditing && this.editedAppointment && this.editedAppointment.id) {
        await this.apptSvc.updateAppointment(this.editedAppointment.id, {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          service: service
        });
        
        alert('Cita actualizada correctamente');
      } else {
        await this.app.addAppointment({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          description: formData.description,
          date: formData.date,
          time: formData.time,
          service: service,
          datetime: this.createTimestamp(formData.date, formData.time)
        });
        
        alert('Cita creada correctamente');
      }

      this.isEditing = false;
      this.isCreating = false;
      this.editedAppointment = null;
      this.editForm.reset();

    } catch (error) {
      console.error('Error al guardar la cita:', error);
      const action = this.isEditing ? 'actualizar' : 'crear';
      alert(`No se pudo ${action} la cita. Por favor, intenta nuevamente.`);
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
    if (!confirm('¿Estás seguro de que deseas eliminar esta cita?')) {
      return;
    }

    try {
      await this.apptSvc.deleteAppointment(id);

      if (this.isEditing && this.editedAppointment?.id === id) {
        this.cancelEdit();
      }

      this.selectedAppointmentId$.next(null);
      alert('Cita eliminada correctamente');

    } catch (error) {
      console.error('Error al eliminar la cita:', error);
      alert('No se pudo eliminar la cita. Por favor, intenta nuevamente.');
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
    if (!this.availabilityData) return true; // Si no hay datos, asumir disponible

    const dateKey = this.toISODate(date);
    const ex = this.availabilityData?.exceptions?.[dateKey];

    if (ex) {
      // Si hay excepción específica para este día
      return !ex.closed && ex.intervals && ex.intervals.length > 0;
    } else {
      // Usar horario por defecto según el día de la semana
      const dayName = this.getDayName(date);
      const ds = this.availabilityData?.defaultSchedule?.[dayName];
      return !!(ds && !ds.closed && ds.intervals && ds.intervals.length > 0);
    }
  }

  private validateSelectedAppointmentForCurrentDay() {
    const selectedId = this.selectedAppointmentId$.value;
    if (!selectedId) return;

    this.filteredForDay$.subscribe(dayAppointments => {
      const appointmentExistsInDay = dayAppointments.some(a => a.id === selectedId);
      if (!appointmentExistsInDay) {
        this.selectedAppointmentId$.next(null);
      }
    }).unsubscribe();
  }

  private scrollToAppointment(timeNormalized: string) {
    if (!this.calendarBody || !this.calendarBody.nativeElement) return;

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      if (!this.calendarBody || !this.calendarBody.nativeElement) {
        return;
      }

      const hourToFind = this.extractHourFromTime(timeNormalized);
      const hourElement = this.calendarBody.nativeElement.querySelector(
        `[data-hour="${hourToFind}"]`
      ) as HTMLElement;

      if (hourElement) {
        hourElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        this.highlightAppointment(hourElement);
      }
    }, 100);
  }

  private highlightAppointment(element: HTMLElement) {
    const reservation = element.querySelector('.reservation') as HTMLElement;
    if (reservation) {
      reservation.classList.add('highlighted');
      setTimeout(() => {
        reservation.classList.remove('highlighted');
      }, 2000);
    }
  }

  private extractHourFromTime(time: string): string {
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const minNum = parseInt(minute) || 0;

    if (minNum >= 30) {
      return `${this.pad(hourNum)}:30`;
    } else {
      return `${this.pad(hourNum)}:00`;
    }
  }

  private parseISODate(isoDate: string): Date | null {
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    return null;
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
    } else if (a.datetime && a.datetime.seconds) {
      const d = new Date(a.datetime.seconds * 1000);
      out.dateISO = this.toISODate(d);
    } else if (a.createdAt && a.createdAt.seconds) {
      const d = new Date(a.createdAt.seconds * 1000);
      out.dateISO = this.toISODate(d);
    } else {
      out.dateISO = undefined;
    }

    if (a.time) {
      out.timeNormalized = a.time;
    } else if (a.datetime && a.datetime.seconds) {
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

      const appointmentTime = a.timeNormalized;
      const slotHour = hour.substring(0, 5);
      
      // Obtener duración del servicio (por defecto 30 min)
      const serviceDuration = a.service?.time || 30;
      
      // Convertir tiempos a minutos desde medianoche para facilitar cálculos
      const appointmentMinutes = this.timeToMinutes(appointmentTime);
      const slotMinutes = this.timeToMinutes(slotHour);
      
      // Verificar si este slot está dentro del rango de duración de la cita
      return slotMinutes >= appointmentMinutes && 
             slotMinutes < (appointmentMinutes + serviceDuration);
    });
  }

  formatDateHeader(d: Date) {
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  getAppointmentDuration(appointment: Appointment): string {
    if (appointment.service && appointment.service.time) {
      return `${appointment.service.time}min`;
    }
    return '30min';
  }

  goToToday() {
    this.selectedDate$.next(new Date());
    this.selectedAppointmentId$.next(null);
  }
}