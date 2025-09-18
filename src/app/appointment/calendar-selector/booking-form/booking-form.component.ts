import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AppointmentService } from '../../../services/appointments.service';
import {NgForOf, NgIf} from '@angular/common';
import {Barber, Service} from '../../../admin-panel/types/admin.types';
import { ServiceManager } from '../../../services/admin-panel/services-management.service';
import { AlertService } from '../../../services/alert/alert.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [FormsModule, NgIf, NgForOf],
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.scss']
})
export class BookingFormComponent implements OnChanges {

  @Input() date?: string | null = null;
  @Input() time?: string | null = null;

  @Input() barbers: Barber[] = [];
  @Input() allowBarberSelection: boolean = false;

  private sv = inject(ServiceManager);
  private toast = inject(AlertService);

  @Output() formSubmitted = new EventEmitter<{
    name: string;
    email: string;
    phone: string;
    description?: string;
    barber?: string
    service: Service
  }>();

  submitted = false;
  formRef?: NgForm;
  submitting = false;
  services: Service[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['date']) {
      console.log('BookingFormComponent recibió date:', this.date);
    }
    if (changes['time']) {
      console.log('BookingFormComponent recibió time:', this.time);
    }
    if (changes['barbers']) {
      console.log('BookingFormComponent recibió barbers:', this.barbers);
    }
  }

  async ngOnInit(){
    this.services = await this.sv.getServicesDirectly();
  }
  onSubmit(form: NgForm) {
    this.submitted = true;
    this.formRef = form;

    if (this.submitting) {
      this.toast.error('Ya hay un formulario enviandose, inténtelo de nuevo');
      return
    };

    const email = form.value.email?.trim();
    const phone = form.value.phone?.trim();
    const hasEmail = !!email;
    const hasPhone = !!phone;
    const emailValid = hasEmail ? this.isEmailValid(email) : true;
    const phoneValid = hasPhone ? this.isPhoneValid(phone) : true;
    const hasContact = hasEmail || hasPhone;

    if (form.controls['name']?.invalid) {
      this.toast.error('El nombre es inválido');
      return
    }
    if (!hasContact) {
      this.toast.error('Tiene que tener al menos una forma de contacto');
      return
    }
    if (!emailValid) {
      this.toast.error('Introduce un email válido (tu-usuario@tu-proveedor.x)');
      return
    }
    if (!phoneValid) {
      this.toast.error('Introduzca un teléfono válido (9 números)');
      return
    }
    if (!form.value.service) {
      this.toast.error('Escoja un servicio');
      return;
    }

    const appointmentData = {
      name: form.value.name.trim(),
      email: email || '',
      phone: phone || '',
      description: form.value.description?.trim() || '',
      barber: form.value.barber || '',
      service: this.services.find(s => s.name === form.value.service)! || ''
    };
    this.submitting = true;
    this.formSubmitted.emit(appointmentData);
  }


  resetAll() {
    if (this.formRef) {
      this.formRef.resetForm();
    }
    this.submitted = false;
  }

  isPhoneValid(phone: string): boolean {
    const phoneRegex = /^[0-9]{9}$/;
    return phoneRegex.test(phone);
  }

  isEmailValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  get nameInvalid() {
    const name = this.formRef?.controls['name'];
    return this.submitted && name?.invalid;
  }

  get emailInvalid() {
    const email = this.formRef?.controls['email'];
    const value = email?.value?.trim();
    return this.submitted && !!value && !this.isEmailValid(value);
  }

  get phoneInvalid() {
    const phone = this.formRef?.controls['phone'];
    const value = phone?.value?.trim();
    return this.submitted && !!value && !this.isPhoneValid(value);
  }

  get contactEmpty() {
    const email = this.formRef?.controls['email']?.value?.trim();
    const phone = this.formRef?.controls['phone']?.value?.trim();
    return this.submitted && !email && !phone;
  }
}
