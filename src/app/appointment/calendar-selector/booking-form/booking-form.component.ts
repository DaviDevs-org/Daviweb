import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { AppointmentService } from '../../../services/appointments.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <p><strong>DEBUG - fecha:</strong> {{ date }}</p>
    <p><strong>DEBUG - hora:</strong> {{ time }}</p>

    <form #bookingForm="ngForm" (ngSubmit)="onSubmit(bookingForm)" novalidate class="booking-form-container">
      <!-- campos -->
      <div class="form-group">
        <label for="name">Nombre</label>
        <input id="name" name="name" ngModel required minlength="2" />
        <div class="error" [class.visible]="nameInvalid">
          Nombre es obligatorio (mínimo 2 caracteres).
        </div>
      </div>

      <div class="form-group">
        <label for="email">Correo electrónico</label>
        <input id="email" type="email" name="email" ngModel />
        <div class="error" [class.visible]="emailInvalid">
          Introduce un email válido si decides rellenarlo.
        </div>
      </div>

      <div class="form-group">
        <label for="phone">Teléfono</label>
        <input id="phone" type="tel" name="phone" ngModel />
        <div class="error" [class.visible]="phoneInvalid">
          Introduce un teléfono válido si decides rellenarlo.
        </div>
      </div>

      <div class="error" [class.visible]="contactEmpty">
        Debes rellenar al menos un medio de contacto: email o teléfono.
      </div>

      <div class="form-group">
        <label for="description">Descripción (opcional)</label>
        <textarea id="description" name="description" ngModel rows="3"></textarea>
      </div>

      <button type="submit" class="submit-btn" [disabled]="!date || !time || submitting">Enviar Reserva</button>
    </form>
  `,
  styles: [`
    .booking-form-container {
      max-width: 400px;
      margin: 0 auto;
      background: rgba(97, 53, 35, 0.6);
      padding: 20px;
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      color: #f3e1b0;
      box-shadow: 0 4px 12px rgb(0 0 0 / 0.15);
    }

    .form-group {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
    }

    label {
      font-weight: 700;
      margin-bottom: 6px;
      color: #f3e1b0;
    }

    input, textarea {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1.8px solid #d4b258;
      font-size: 14px;
      color: #613523;
      font-weight: 600;
      background: #f3e1b0;
      outline-offset: 2px;
      outline-color: transparent;
      transition: outline-color 0.3s ease;
    }

    input:focus, textarea:focus {
      outline-color: #d4b258;
      box-shadow: 0 0 6px #d4b258aa;
    }

    .error {
      color: #ff4d4d;
      font-size: 13px;
      margin-top: 4px;
      font-weight: 600;
      max-height: 0;
      opacity: 0;
      transition: max-height 0.6s ease, opacity 0.5s ease;
      overflow: hidden;
    }

    .error.visible {
      max-height: 50px;
      opacity: 1;
    }

    .submit-btn {
      background-color: #d4b258;
      border: none;
      color: #613523;
      font-weight: 700;
      padding: 12px;
      border-radius: 12px;
      width: 100%;
      cursor: pointer;
      transition: background-color 0.3s ease;
    }

    .submit-btn:hover:not(:disabled) {
      background-color: #b8953a;
    }

    .submit-btn:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
  `]
})
export class BookingFormComponent implements OnChanges {

  @Input() date?: string | null = null;
  @Input() time?: string | null = null;

  @Output() formSubmitted = new EventEmitter<{ name: string; email: string; phone: string; description?: string }>();

  submitted = false;
  formRef?: NgForm;
  submitting = false; // evita múltiples pulsaciones rápidas

  ngOnChanges(changes: SimpleChanges) {
    if (changes['date']) {
      console.log('BookingFormComponent recibió date:', this.date);
    }
    if (changes['time']) {
      console.log('BookingFormComponent recibió time:', this.time);
    }
  }

  onSubmit(form: NgForm) {
    console.log('[BookingForm] onSubmit - form value:', form.value);
    this.submitted = true;
    this.formRef = form;

    if (this.submitting) return;

    const email = form.value.email?.trim();
    const phone = form.value.phone?.trim();

    const hasEmail = !!email;
    const hasPhone = !!phone;

    const emailValid = hasEmail ? this.isEmailValid(email) : true;
    const phoneValid = hasPhone ? this.isPhoneValid(phone) : true;
    const hasContact = hasEmail || hasPhone;

    if (form.controls['name']?.invalid || !hasContact || !emailValid || !phoneValid) return;

    const appointmentData = {
      name: form.value.name.trim(),
      email: email || '',
      phone: phone || '',
      description: form.value.description?.trim() || ''
    };

    this.submitting = true;
    this.formSubmitted.emit(appointmentData);
    setTimeout(() => this.submitting = false, 1000);
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
