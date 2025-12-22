import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { BookingFormComponent } from './booking-form.component';
import { BusinessStateService } from '@presentation/shared/business-state.service';
import { BookingPreselectionService } from '@presentation/shared/booking-preselection.service';
import { GetServicesUseCase } from '@application/services';
import { Service } from '@domain/index';

describe('BookingFormComponent', () => {
  let fixture: ComponentFixture<BookingFormComponent>;
  let component: BookingFormComponent;

  let businessStateSpy: { services: ReturnType<typeof signal> };
  let preselectionSpy: { preselection$: any };
  let getServicesUseCaseSpy: jasmine.SpyObj<GetServicesUseCase>;

  let mockService1: Service;
  let mockService2: Service;

  beforeEach(async () => {
    // create fake services
    mockService1 = {
      name: 'Corte básico',
      requiresHairLength: false,
      computeTotalTime: () => 30,
    } as unknown as Service;

    mockService2 = {
      name: 'Tinte largo',
      requiresHairLength: true,
      computeTotalTime: (length?: any) => (length === 'long' ? 90 : 60),
    } as unknown as Service;

    businessStateSpy = {
      services: signal<Service[]>([mockService1, mockService2]),
    };

    preselectionSpy = {
      preselection$: of({ serviceName: null, barberName: null }),
    };

    getServicesUseCaseSpy = jasmine.createSpyObj<GetServicesUseCase>(
      'GetServicesUseCase',
      ['execute'],
    );

    await TestBed.configureTestingModule({
  imports: [BookingFormComponent, ReactiveFormsModule],
  providers: [
    { provide: BusinessStateService, useValue: businessStateSpy },
    { provide: BookingPreselectionService, useValue: preselectionSpy },
    { provide: GetServicesUseCase, useValue: getServicesUseCaseSpy },

    // Add this:
    provideRouter([]),
    {
      provide: ActivatedRoute,
      useValue: { snapshot: {}, params: of({}), queryParams: of({}) },
    },
  ],
}).compileComponents();


    fixture = TestBed.createComponent(BookingFormComponent);
    component = fixture.componentInstance;

    // satisfy required inputs
    fixture.componentRef.setInput('date', '2099-01-01');
    fixture.componentRef.setInput('time', '10:00');
    fixture.componentRef.setInput('availableSlots', ['10:00', '10:30', '11:00']);
    fixture.componentRef.setInput('barbers', []);
    fixture.componentRef.setInput('allowBarberSelection', false);
    fixture.componentRef.setInput('isSubmitting', false);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not emit when form is invalid', () => {
    const emitted: any[] = [];
    component.formSubmitted.subscribe(v => emitted.push(v));

    // leave form invalid (name empty, privacyConsent false)
    component.onSubmit();

    expect(emitted.length).toBe(0);
    expect(component.bookingForm.touched).toBeTrue();
  });

  it('should emit formSubmitted with correct payload when form is valid', () => {
    const emitted: any[] = [];
    component.formSubmitted.subscribe(v => emitted.push(v));

    component.bookingForm.setValue({
      name: 'John Doe',
      phone: '+34 600000000',
      serviceId: mockService1.name,
      barberId: '',
      description: 'Nota',
      hairLength: 'medium',
      privacyConsent: true,
    });

    component.onSubmit();

    expect(emitted.length).toBe(1);
    const payload = emitted[0];

    expect(payload.name).toBe('John Doe');
    expect(payload.phone).toBe('+34 600000000');
    expect(payload.description).toBe('Nota');
    expect(payload.barber).toBeUndefined(); // empty string becomes undefined
    expect(payload.service).toBe(mockService1);
    expect(payload.hairLength).toBe('medium');
  });

  it('should filter availableServices according to slots and duration', () => {
    // make mockService1 fit and mockService2 not fit by limiting slots
    fixture.componentRef.setInput('availableSlots', ['10:00', '10:30']); // 60 minutes max

    component.bookingForm.patchValue({ hairLength: 'long' });
    fixture.detectChanges();

    const services = component.availableServices();
    expect(services.some(s => s.name === 'Corte básico')).toBeTrue();
    // Tinte largo needs more time; likely filtered out
    expect(services.some(s => s.name === 'Tinte largo')).toBeFalse();
  });

  it('should reflect selectedServiceRequiresHairLength based on selected service', () => {
    // select service without hair length requirement
    component.bookingForm.patchValue({ serviceId: mockService1.name });
    fixture.detectChanges();

    expect(component.selectedServiceRequiresHairLength()).toBeFalse();

    // select service that requires hair length
    component.bookingForm.patchValue({ serviceId: mockService2.name });
    fixture.detectChanges();

    expect(component.selectedServiceRequiresHairLength()).toBeTrue();
  });

  it('should compute currentDuration based on selected service and hair length', () => {
    component.bookingForm.patchValue({
      serviceId: mockService2.name,
      hairLength: 'long',
    });
    fixture.detectChanges();

    expect(component.currentDuration()).toBe(90);
  });

  it('should replace image src with fallback on error', () => {
    const img = document.createElement('img');
    img.src = '/short.jpeg';

    const event = { target: img } as any;
    component.handleImageError(event, 'assets/hair-length/short.png');

    expect(img.src.endsWith('assets/hair-length/short.png')).toBeTrue();

    // calling again should not change if already fallback
    const previous = img.src;
    component.handleImageError(event, 'assets/hair-length/short.png');
    expect(img.src).toBe(previous);
  });
});
