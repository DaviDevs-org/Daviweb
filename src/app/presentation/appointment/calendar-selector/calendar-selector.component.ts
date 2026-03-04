import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HourSelectorComponent } from './hour-selector/hour-selector.component';
import { BookingFormComponent } from './booking-form/booking-form.component';
import {
  Service,
  PastDateHandler,
  ExceptionHandler,
  WeeklyScheduleHandler,
  AvailabilityContext,
  Appointment,
  Phone,
} from '@domain/index';
import { GetAvailableSlotsForDayService } from '@domain/business-info/availability/get-available-slots-for-day.service';
import { AlertService } from '../../shared/alert/alert.service';
import { BusinessStateService } from '@presentation/shared/business-state.service';
import { AddAppointmentUseCase } from '@application/appointments/add-appointment.use-case';
import { CreatePaymentIntentUseCase } from '@application/payment/create-payment-intent.use-case';
import { TenantService } from 'src/app/config/tenant.service';
import { StripePaymentComponent } from '../stripe-payment/stripe-payment.component';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-calendar-selector',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HourSelectorComponent,
    BookingFormComponent,
    StripePaymentComponent
  ],
  templateUrl: './calendar-selector.component.html',
  styleUrls: ['./calendar-selector.component.scss'],
})
export class CalendarSelectorComponent implements AfterViewInit {
  // Dependencies
  public readonly businessState = inject(BusinessStateService);
  private addAppointmentUseCase = inject(AddAppointmentUseCase);
  private createPaymentIntentUseCase = inject(CreatePaymentIntentUseCase);
  public tenantService = inject(TenantService);
  private toast = inject(AlertService);

  // State Signals
  public selectedYear = signal(new Date().getFullYear());
  public selectedMonth = signal(new Date().getMonth());
  public showPicker = signal(false);
  public slotCapacity = signal<Map<string, number>>(new Map());


  public selectedDate = signal<Date | null>(null);
  public selectedHour = signal<string | null>(null);
  
  // Payment State
  public clientSecret = signal<string | null>(null);
  public stripeAccountId = signal<string | null>(null); // Añadido
  public amountToPay = signal<number>(0);
  public pendingAppointment = signal<Appointment | null>(null);

  // Data Signals
  public schedule = this.businessState.rawSchedule;
  public exceptions = this.businessState.exceptions;

  public availableHours = signal<string[]>([]);
  public isSubmitting = signal(false);

  public appointments = this.businessState.appointments;

  // Constants
  public readonly monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  public readonly weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  public readonly phoneOnlyDays = [5, 6]; // Viernes y Sábado
  public readonly years: number[] = [];

  @ViewChild('monthYearBtn') monthYearBtn?: ElementRef<HTMLButtonElement>;

  // Computed
  public calendarMatrix = computed(() => {
    const year = this.selectedYear();
    const month = this.selectedMonth();
    const matrix: (Date | null)[][] = [];

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDay = firstDayOfMonth.getDay();
    startDay = startDay === 0 ? 7 : startDay; // Lunes = 1
    let currentDay = 1 - (startDay - 1);

    while (currentDay <= lastDayOfMonth.getDate()) {
      const week: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (currentDay > 0 && currentDay <= lastDayOfMonth.getDate()) {
          week.push(new Date(year, month, currentDay));
        } else {
          week.push(null);
        }
        currentDay++;
      }
      matrix.push(week);
    }
    return matrix;
  });

  public barbers = computed(
    () => this.businessState.barberSettings()?.barbers ?? []
  );

  public allowBarberSelection = computed(
    () => this.businessState.barberSettings()?.barberSelection ?? false
  );

  public currentView = computed(() => {
    if (this.clientSecret()) return 'payment';
    if (this.selectedHour()) return 'booking';
    if (this.selectedDate()) return 'hours';
    return 'calendar';
  });

  constructor() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear + 2; y++) this.years.push(y);
  }

  ngAfterViewInit() {
    // Focus logic can be implemented here if needed, using effects or direct DOM manipulation
    // For now, we'll keep it simple or adapt the old logic if strictly required
    setTimeout(() => this.focusFirstAvailableDay(), 0);
  }

  public prevMonth() {
    let m = this.selectedMonth() - 1;
    let y = this.selectedYear();
    if (m < 0) {
      m = 11;
      y--;
    }
    this.selectedMonth.set(m);
    this.selectedYear.set(y);
    this.onDateChange();
  }

  public nextMonth() {
    let m = this.selectedMonth() + 1;
    let y = this.selectedYear();
    if (m > 11) {
      m = 0;
      y++;
    }
    this.selectedMonth.set(m);
    this.selectedYear.set(y);
    this.onDateChange();
  }

  // Actions
  public togglePicker() {
    this.showPicker.update((v) => !v);
  }

  public onDateChange() {
    this.showPicker.set(false);
    // Focus restoration logic if needed
  }

  public async selectDate(date: Date | null) {
    if (!date || !this.isAvailable(date)) return;

    this.selectedDate.set(date);
    this.selectedHour.set(null);

    try {
      const slots = this.businessState.getAvailableSlotsForDate(date);
      this.availableHours.set(slots);

      if (this.allowBarberSelection()) {
        const capacity = this.businessState.getSlotCapacity(date);
        this.slotCapacity.set(capacity);
      } else {
        this.slotCapacity.set(new Map());
      }
    } catch (error: unknown) {
      console.error('Error loading slots:', error);
      this.toast.error('No se pudieron cargar las horas disponibles');
      this.availableHours.set([]);
    }
  }

  public onHourSelected(hour: string) {
    this.selectedHour.set(hour);
  }

  public onBackToCalendar() {
    this.selectedDate.set(null);
    this.selectedHour.set(null);
    this.availableHours.set([]);
  }

  public onBackToHours() {
    this.selectedHour.set(null);
  }

  public async onBookingSubmit(data: {
    name: string;
    phone: string;
    description?: string;
    barberId?: string;
    barberName?: string;
    service: Service;
    hairLength?: 'short' | 'medium' | 'long' | null;
  }) {
    const date = this.selectedDate();
    const time = this.selectedHour();

    if (!date || !time) return;

    this.isSubmitting.set(true);

    try {
      // Construct full datetime
      const [hours, minutes] = time.split(':').map(Number);
      const appointmentDate = new Date(date);
      appointmentDate.setHours(hours, minutes, 0, 0);
      const phone = new Phone(data.phone);
      
      // Create Appointment entity
      const appointment = new Appointment(
        appointmentDate,
        data.service, 
        undefined, // id
        data.description,
        data.name,
        phone.getValue(),
        data.barberName, 
        data.barberId,
        data.barberName,
        data.hairLength || undefined
      );

      // --- PAGOS ---
      const tenant = this.tenantService.tenant();
      const payments = tenant?.payments;
      
      if (payments?.stripeStatus === 'active' && payments.prePaymentPolicy && payments.prePaymentPolicy !== 'none' && tenant?.id) {
        const fullPrice = data.service.getPrice(data.hairLength || undefined);
        let amount = 0;

        if (payments.prePaymentPolicy === 'full') {
          amount = fullPrice;
        } else if (payments.prePaymentPolicy === 'fixed') {
          amount = payments.prePaymentValue;
        } else if (payments.prePaymentPolicy === 'percentage') {
          amount = (fullPrice * payments.prePaymentValue) / 100;
        }

        // Solo si el importe supera el mínimo de Stripe (0.50€)
        if (amount >= 0.5) {
          try {
            const { clientSecret, stripeAccountId } = await this.createPaymentIntentUseCase.execute(
              data.service.id!,
              tenant.id,
              data.hairLength || undefined
            );
            
            this.amountToPay.set(amount);
            this.pendingAppointment.set(appointment);
            this.clientSecret.set(clientSecret);
            // Usamos el ID retornado por el backend, que es el source of truth para este intento de pago
            this.stripeAccountId.set(stripeAccountId || tenant.payments.stripeAccountId || null); 
            this.isSubmitting.set(false);
            return; // Detenemos aquí para mostrar la pasarela
          } catch (err: any) {
            console.error('Error iniciando pago:', err);
            this.toast.error('Error al iniciar el pago: ' + err.message);
            this.isSubmitting.set(false);
            return;
          }
        }
      }

      await this.addAppointmentUseCase.execute(appointment);
      this.handleSuccess();
      
    } catch (error) {
      console.error('Error creating appointment:', error);
      this.toast.error(`Error al intentar crear la reserva: ${error instanceof Error ? error.message : 'Desconocido'}`);
      this.isSubmitting.set(false);
    }
  }

  public async onPaymentSuccess(paymentIntentId: string) {
    this.isSubmitting.set(true);
    const appointment = this.pendingAppointment();
    
    if (!appointment) {
      this.toast.error('Error crítico: Se perdió la información de la cita');
      this.isSubmitting.set(false);
      return;
    }

    try {
      appointment.paymentStatus = 'paid';
      appointment.stripePaymentIntentId = paymentIntentId;
      appointment.amountPaid = this.amountToPay();

      await this.addAppointmentUseCase.execute(appointment);
      this.handleSuccess();
    
    } catch (error) {
       console.error('Error saving paid appointment:', error);
       // Aquí lo ideal sería intentar reintentar o guardar un log de error crítico
       this.toast.error('El pago se ha realizado, pero hubo un error al guardar la cita. Por favor contacta con el negocio.');
       this.isSubmitting.set(false);
    }
  }

  public onPaymentError(errorMsg: string) {
    this.toast.error(errorMsg);
    // No reseteamos submitting aquí porque el usuario puede reintentar
  }

  public onBackToBooking() {
    this.clientSecret.set(null);
    this.pendingAppointment.set(null);
    this.amountToPay.set(0);
    this.isSubmitting.set(false);
  }

  private handleSuccess() {
      this.toast.success('Reserva confirmada con éxito');
      this.selectedDate.set(null);
      this.selectedHour.set(null);
      this.clientSecret.set(null);
      this.pendingAppointment.set(null);
      this.amountToPay.set(0);
      this.isSubmitting.set(false);
  }


  // Helpers
  public isToday(date: Date | null): boolean {
    if (!date) return false;
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  public isSelected(date: Date | null): boolean {
    const selected = this.selectedDate();
    if (!date || !selected) return false;
    return date.getTime() === selected.getTime();
  }

  public isAvailable(date: Date | null): boolean {
    if (!date) return false;
    if (date.getMonth() !== this.selectedMonth()) return false; // Disable days from other months

    const context: AvailabilityContext = {
      date: date,
      schedule: this.schedule(),
      exceptions: this.exceptions(),
      barbers: this.barbers(),
      checkBarberAvailability: true,
    };

    // Instantiate handlers
    const pastDateHandler = new PastDateHandler();
    const exceptionHandler = new ExceptionHandler();
    const weeklyScheduleHandler = new WeeklyScheduleHandler();

    // Chain them
    pastDateHandler.setNext(exceptionHandler).setNext(weeklyScheduleHandler);

    // Execute chain
    const result = pastDateHandler.handle(context);

    return result.isAvailable;
  }

  public isPhoneOnly(date: Date): boolean {
    // Logic for phone only days (e.g. weekends)
    // This might need to be more sophisticated or come from config
    // For now using the hardcoded array
    return this.phoneOnlyDays.includes(date.getDay());
  }

  public formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Navigation Helpers (Simplified for brevity, can be expanded)
  private focusFirstAvailableDay() {
    // Implementation similar to before but using signals/DOM
    // This is a nice-to-have for accessibility
  }
}
