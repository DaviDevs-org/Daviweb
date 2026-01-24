import {
  Component,
  input,
  output,
  inject,
  computed,
  signal,
  effect,
} from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

import { BusinessStateService } from '@presentation/shared/business-state.service';
import { BookingPreselectionService } from '@presentation/shared/booking-preselection.service';
import { Barber, Service } from '@domain/index';
import { GetServicesUseCase } from '@application/services';
import { TimeUtils } from '@domain/shared/utils/time.utils';
import { PhoneInputComponent } from '@presentation/shared/components/phone-input/phone-input.component';
import { getRandomValues } from 'node:crypto';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, PhoneInputComponent],
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.scss'],
})
export class BookingFormComponent {
  // Inputs
  public date = input.required<string | null>(); // ISO Date string
  public time = input.required<string | null>(); // HH:mm
  public barbers = input<Barber[]>([]);
  public allowBarberSelection = input<boolean>(false);
  public availableSlots = input<string[]>([]); // List of all available start times for the day
  public isSubmitting = input<boolean>(false);

  // Outputs
  public formSubmitted = output<{
    name: string;
    phone: string;
    description?: string;
    barberId?: string;
    barberName?: string;
    service: Service;
    hairLength?: 'short' | 'medium' | 'long' | null;
  }>();

  // Dependencies
  private fb = inject(FormBuilder);
  private getServicesUseCase = inject(GetServicesUseCase);
  private preselectionService = inject(BookingPreselectionService);

  // State
  private businessState = inject(BusinessStateService);
  public services = this.businessState.services;

  // Form
  public bookingForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required]], // Validation handled by component
    serviceId: ['', Validators.required],
    barberId: [''],
    description: [''],
    hairLength: ['medium'], // Default
    privacyConsent: [false, Validators.requiredTrue],
  });

  public selectedServiceId = toSignal(
    this.bookingForm.controls.serviceId.valueChanges,
    { initialValue: '' }
  );
  public hairLength = toSignal(
    this.bookingForm.controls.hairLength.valueChanges,
    { initialValue: 'medium' }
  );

  // Signals
  private preselection = toSignal(this.preselectionService.preselection$, {
    initialValue: {} as import('@presentation/shared/booking-preselection.service').BookingPreselection,
  });

  // Computed
  public availableServices = computed(() => {
    const allServices = this.services();
    const startTime = this.time();
    const slots = this.availableSlots();

    if (!startTime || !slots.length || !allServices.length) return [];

    return allServices.filter((service) =>
      this.doesServiceFit(service, startTime, slots)
    );
  });

  public selectedServiceRequiresHairLength = computed(() => {
    const id = this.selectedServiceId();
    const service = this.services().find((s) => s.name === id);
    return service?.requiresHairLength ?? false;
  });

  public availableBarbersForSelection = computed(() => {
    const allBarbers = this.barbers();
    const dateStr = this.date();
    const time = this.time();
    const serviceId = this.selectedServiceId();
    const service = this.services().find((s) => s.name === serviceId);
    const length = this.hairLength();

    if (!dateStr || !time || !this.allowBarberSelection()) return [];

    return allBarbers.filter((barber) => {
      if (!barber.id) return false;
      return this.businessState.isBarberAvailable(
        barber.id,
        new Date(dateStr),
        time,
        service,
        length as any
      );
    });
  });

  public currentDuration = computed(() => {
    const id = this.selectedServiceId();
    const length = this.hairLength();
    const service = this.services().find((s) => s.name === id);
    if (!service) return 0;
    return service.computeTotalTime(length as any);
  });

  constructor() {
    // Aplicar preselección si existe
    effect(() => {
      const preselection = this.preselection();
      const services = this.availableServices(); // Esperar a que se calculen los servicios disponibles

      if (services.length > 0 && preselection.serviceName) {
        // Verificar si el servicio preseleccionado está disponible para esta hora
        const isAvailable = services.some(
          (s) => s.name === preselection.serviceName
        );

        if (isAvailable) {
          // Usamos patchValue con emitEvent: false para evitar bucles si fuera necesario,
          // aunque aquí queremos que se disparen los signals derivados
          // Solo actualizamos si es diferente para no molestar si el usuario ya lo tiene
          if (this.bookingForm.get('serviceId')?.value !== preselection.serviceName) {
             this.bookingForm.patchValue({
              serviceId: preselection.serviceName,
            });
          }
        }
      }

      if (preselection.barberName && this.allowBarberSelection()) {
        const barberIdCtrl = this.bookingForm.get('barberId');
        const matchingBarber = this.barbers().find(
          (b) => b.name === preselection.barberName
        );

        // El control guarda IDs (o 'anyone'), no nombres.
        if (matchingBarber?.id && barberIdCtrl?.value !== matchingBarber.id) {
          this.bookingForm.patchValue({
            barberId: matchingBarber.id,
          });
        }
      }
    });

    effect(() => {
      const allow = this.allowBarberSelection();
      const ctrl = this.bookingForm.controls.barberId;
      if (allow) {
        ctrl.setValidators(Validators.required);
      } else {
        ctrl.clearValidators();
      }
      ctrl.updateValueAndValidity();
    });
  }

  onSubmit() {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const val = this.bookingForm.value;
    const service = this.services().find((s) => s.name === val.serviceId);

    if (!service) return;

    let barberId = val.barberId || undefined;
    let barberName: string | undefined;

    if (this.allowBarberSelection()) {
      const barberIdCtrl = this.bookingForm.controls.barberId;
      const available = this.availableBarbersForSelection();

      if (barberId === 'anyone') {
        if (available.length === 0) {
          barberIdCtrl.setErrors({ noAvailableBarbers: true });
          barberIdCtrl.markAsTouched();
          return;
        }

        const randomIndex = Math.floor(Math.random() * available.length);
        const chosen = available[randomIndex];
        if (!chosen?.id) {
          barberIdCtrl.setErrors({ invalidBarberSelection: true });
          barberIdCtrl.markAsTouched();
          return;
        }

        barberName = chosen.name;
        barberId = chosen.id;
      } else if (barberId) {
        const chosen = available.find((b) => b.id === barberId);
        if (!chosen?.id) {
          barberIdCtrl.setErrors({ invalidBarberSelection: true });
          barberIdCtrl.markAsTouched();
          return;
        }

        barberName = chosen.name;
        barberId = chosen.id;
      }
    }

    this.formSubmitted.emit({
      name: val.name!,
      phone: val.phone!,
      description: val.description || undefined,
      barberId: barberId,
      barberName: barberName,
      service: service,
      hairLength: val.hairLength as any,
    });
  }

  private doesServiceFit(
    service: Service,
    startTime: string,
    availableSlots: string[]
  ): boolean {
    const startMinutes = TimeUtils.timeToMinutes(startTime);

    // 1. Validar Rango Horario del Servicio (si existe)
    if (service.hourRange) {
      const rangeStart = TimeUtils.timeToMinutes(service.hourRange.start);
      const rangeEnd = TimeUtils.timeToMinutes(service.hourRange.end);

      // La hora de inicio de la cita debe estar DENTRO del rango permitido
      // (start >= rangeStart Y start < rangeEnd)
      if (startMinutes < rangeStart || startMinutes >= rangeEnd) {
        return false;
      }
    }

    // 2. Validar Disponibilidad de Slots (duración)
    const duration = service.computeTotalTime('medium');
    const slotsNeeded = Math.ceil(duration / 30);

    for (let i = 0; i < slotsNeeded; i++) {
      const checkTime = TimeUtils.minutesToTime(startMinutes + i * 30);
      if (!availableSlots.includes(checkTime)) {
        return false;
      }
    }
    return true;
  }

  getServiceDuration(service: Service): number {
    return service.computeTotalTime('medium');
  }

  handleImageError(event: any, fallbackSrc: string) {
    const img = event.target as HTMLImageElement;
    if (img.src !== window.location.origin + '/' + fallbackSrc) {
       img.src = fallbackSrc;
    }
  }
}
