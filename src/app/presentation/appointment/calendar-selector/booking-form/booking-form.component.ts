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
import { Barber, Service } from '@domain/index';
import { GetServicesUseCase } from '@application/services';
import { TimeUtils } from '@domain/shared/utils/time.utils';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
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

  // Outputs
  public formSubmitted = output<{
    name: string;
    phone: string;
    description?: string;
    barber?: string;
    service: Service;
    hairLength?: 'short' | 'medium' | 'long' | null;
  }>();

  // Dependencies
  private fb = inject(FormBuilder);
  private getServicesUseCase = inject(GetServicesUseCase);

  // State
  private businessState = inject(BusinessStateService);
  public services = this.businessState.services;
  public isSubmitting = signal(false);

  // Form
  public bookingForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.pattern(/^\+?[0-9\s-]{9,}$/)]],
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

  public currentDuration = computed(() => {
    const id = this.selectedServiceId();
    const length = this.hairLength();
    const service = this.services().find((s) => s.name === id);
    if (!service) return 0;
    return service.computeTotalTime(length as any);
  });

  constructor() {
    // Optional: React to form changes if needed
  }

  onSubmit() {
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const val = this.bookingForm.value;
    const service = this.services().find((s) => s.name === val.serviceId);

    if (!service) return;

    this.isSubmitting.set(true);

    this.formSubmitted.emit({
      name: val.name!,
      phone: val.phone!,
      description: val.description || undefined,
      barber: val.barberId || undefined,
      service: service,
      hairLength: val.hairLength as any,
    });
  }

  private doesServiceFit(
    service: Service,
    startTime: string,
    availableSlots: string[]
  ): boolean {
    // Simplified logic: Check if enough contiguous slots exist
    const startMinutes = TimeUtils.timeToMinutes(startTime);
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
}
