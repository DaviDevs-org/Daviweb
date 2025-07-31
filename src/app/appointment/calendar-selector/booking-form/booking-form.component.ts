import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form #bookingForm="ngForm" (ngSubmit)="onSubmit(bookingForm)" novalidate class="booking-form-container">

      <div class="form-group">
        <label for="name">Nombre</label>
        <input id="name" name="name" ngModel required minlength="2" />
        <div class="error" [class.visible]="nameInvalid">
          Nombre es obligatorio (mínimo 2 caracteres).
        </div>
      </div>

      <div class="form-group">
        <label for="email">Correo electrónico</label>
        <input id="email" type="email" name="email" ngModel required email />
        <div class="error" [class.visible]="emailInvalid">
          Introduce un email válido.
        </div>
      </div>

      <div class="form-group">
        <label for="phone">Teléfono</label>
        <input id="phone" type="tel" name="phone" ngModel required pattern="^[0-9\\s+()-]{7,15}$" />
        <div class="error" [class.visible]="phoneInvalid">
          Teléfono obligatorio y formato válido.
        </div>
      </div>

      <div class="form-group">
        <label for="description">Descripción (opcional)</label>
        <textarea id="description" name="description" ngModel rows="3"></textarea>
      </div>

      <button type="submit" class="submit-btn">Enviar Reserva</button>
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
export class BookingFormComponent {

  @Output() formSubmitted = new EventEmitter<{ name: string; email: string; phone: string; description?: string }>();

  submitted = false;
  formRef?: NgForm;

  onSubmit(form: NgForm) {
    this.submitted = true;
    this.formRef = form;

    if (form.valid) {
      this.formSubmitted.emit(form.value);
      form.resetForm();
      this.submitted = false;
    }
  }

  get nameInvalid() {
    const name = this.formRef?.controls['name'];
    return this.submitted && name?.invalid;
  }

  get emailInvalid() {
    const email = this.formRef?.controls['email'];
    return this.submitted && email?.invalid;
  }

  get phoneInvalid() {
    const phone = this.formRef?.controls['phone'];
    return this.submitted && phone?.invalid;
  }
}
