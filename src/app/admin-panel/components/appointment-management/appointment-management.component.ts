import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppointmentService } from '../../../services/admin-panel/appointment-management.service';
import { Appointment } from '../../types/admin.types';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';

@Component({
  selector: 'app-appointment-management',
  standalone: true,
  imports: [CommonModule],
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

  hours = this.generateHours();
  private scrollTimeout: any;

  constructor(private apptSvc: AppointmentService) {
    this.appointments$ = this.apptSvc.getAppointments().pipe(
      map(list => list.map(a => this.normalize(a)))
    );

    this.filteredForDay$ = combineLatest([this.appointments$, this.selectedDate$]).pipe(
      map(([appointments, date]) => {
        const iso = this.toISODate(date);
        return appointments
          .filter(a => a.dateISO === iso)
          .sort((x, y) => (x.timeNormalized || '').localeCompare(y.timeNormalized || ''));
      })
    );

    this.selectedAppointment$ = combineLatest([this.appointments$, this.selectedAppointmentId$]).pipe(
      map(([appointments, id]) => {
        if (!appointments || appointments.length === 0 || !id) return null;
        return appointments.find(a => a.id === id) || null;
      })
    );
  }

  ngAfterViewInit(): void {
    // Observar cambios en la cita seleccionada Y que esté en el día actual para hacer scroll
    combineLatest([this.selectedAppointment$, this.filteredForDay$]).subscribe(([appointment, dayList]) => {
      if (appointment && appointment.timeNormalized && dayList.some(a => a.id === appointment.id)) {
        // Solo hacer scroll si la cita está en el día actual
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

  chooseAppointment(id: string | undefined) {
    if (!id) return;
    
    this.selectedAppointmentId$.next(id);
    
    // Buscar la cita para obtener su fecha y cambiar el día si es necesario
    combineLatest([this.appointments$]).pipe(
      take(1) // Solo tomar el valor actual y completar inmediatamente
    ).subscribe(([appointments]) => {
      const appointment = appointments.find(a => a.id === id);
      if (appointment && appointment.dateISO) {
        const appointmentDate = this.parseISODate(appointment.dateISO);
        if (appointmentDate && !this.isSameDay(appointmentDate, this.selectedDate$.value)) {
          // Cambiar al día de la cita
          this.selectedDate$.next(appointmentDate);
        }
      }
    });
  }

  prevDay() {
    const d = new Date(this.selectedDate$.value.getTime() - 24 * 3600 * 1000);
    this.selectedDate$.next(d);
    // No resetear la selección si la cita pertenece al nuevo día
    this.validateSelectedAppointmentForCurrentDay();
  }

  nextDay() {
    const d = new Date(this.selectedDate$.value.getTime() + 24 * 3600 * 1000);
    this.selectedDate$.next(d);
    // No resetear la selección si la cita pertenece al nuevo día
    this.validateSelectedAppointmentForCurrentDay();
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
    if (!this.calendarBody) return;

    // Limpiar timeout anterior si existe
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Delay pequeño para asegurar que el DOM se ha actualizado
    this.scrollTimeout = setTimeout(() => {
      const hourToFind = this.extractHourFromTime(timeNormalized);
      const hourElement = this.calendarBody.nativeElement.querySelector(
        `[data-hour="${hourToFind}"]`
      ) as HTMLElement;

      if (hourElement) {
        // Scroll suave hasta el elemento
        hourElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        // Destacar temporalmente la cita
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
    // Extraer la hora base (ej: "14:30" -> "14:00" o "14:30")
    const [hour, minute] = time.split(':');
    const hourNum = parseInt(hour);
    const minNum = parseInt(minute) || 0;
    
    // Agrupar por medias horas
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

  // Helpers mejorados
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

  private generateHours(): string[] {
    const hours: string[] = [];
    for (let h = 8; h <= 20; h++) {
      hours.push(this.pad(h) + ':00');
      hours.push(this.pad(h) + ':30');
    }
    return hours;
  }

  // Método mejorado para encontrar reservas que ocupen el slot completo
  findReservation(list: Appointment[], hour: string): Appointment | undefined {
    return list.find(a => {
      if (!a.timeNormalized) return false;
      
      const appointmentTime = a.timeNormalized;
      const slotHour = hour.substring(0, 5); // HH:mm
      
      // Buscar coincidencia exacta o dentro del rango de 30 minutos
      const appointmentHour = parseInt(appointmentTime.split(':')[0]);
      const appointmentMinute = parseInt(appointmentTime.split(':')[1]) || 0;
      const slotHourNum = parseInt(slotHour.split(':')[0]);
      const slotMinute = parseInt(slotHour.split(':')[1]) || 0;
      
      // Si es la misma hora
      if (appointmentHour === slotHourNum) {
        // Para slots de :00, incluir citas de :00 a :29
        // Para slots de :30, incluir citas de :30 a :59
        if (slotMinute === 0) {
          return appointmentMinute >= 0 && appointmentMinute < 30;
        } else {
          return appointmentMinute >= 30 && appointmentMinute < 60;
        }
      }
      
      return false;
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

  // Método auxiliar para el template
  getAppointmentDuration(appointment: Appointment): string {
    // Asumiendo que las citas duran 30 minutos por defecto
    // Puedes modificar esto según tu lógica de negocio
    return '30min';
  }

  // Método para ir al día de hoy
  goToToday() {
    this.selectedDate$.next(new Date());
    this.selectedAppointmentId$.next(null);
  }
}