import { ChangeDetectionStrategy, Component, Input } from "@angular/core";
import {FormGroup, FormBuilder, Validators, ReactiveFormsModule, AbstractControl} from "@angular/forms";
import {NgIf} from '@angular/common';

@Component({
  selector: "app-appointment",
  templateUrl: "./appointment.component.html",
  styleUrls: ["./appointment.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    NgIf
  ]
})
export class AppointmentComponent {

  appointmentForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.appointmentForm = this.fb.group({
      appointmentName: ['', [Validators.required, Validators.pattern(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)]],
      appointmentPhone: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      appointmentMail: ['', [Validators.required, Validators.email]],
      appointmentDate: ['', [Validators.required, (control: AbstractControl) => {
        if (!control.value) return null;
        const dateSelected = new Date(control.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dateSelected < today ? { invalidDate: true } : null;
      }]],
      appointmentService: ['', Validators.required],
      appointmentCommentaries: [''],
    });
  }

    public registerAppointment() {
      if (this.appointmentForm.valid) {
        const datos = this.appointmentForm.value;
        console.log('Cita registrada:', datos);

        this.appointmentForm.reset();
      } else {
        console.warn('El formulario no es válido');
        this.appointmentForm.markAllAsTouched(); // Para mostrar errores si los hubiera
      }
    }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.appointmentForm.get(controlName);
    if (!control) {
      return false;
    }
    return control.hasError(errorName) && control.touched;
  }


}
