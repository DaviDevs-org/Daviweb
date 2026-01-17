import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppointmentActionService } from '@application/appointments/appointment-action.service';
import { Appointment } from '@domain/appointments';

type CancelStatus =
  | 'loading'
  | 'confirming'
  | 'cancelling'
  | 'success'
  | 'error'
  | 'expired'
  | 'not-found'
  | 'kept';

@Component({
  selector: 'app-cancel-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cancel-appointment.component.html',
  styleUrl: './cancel-appointment.component.scss',
})
export class CancelAppointmentComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private actionService = inject(AppointmentActionService);

  status: CancelStatus = 'loading';
  appointment: Appointment | null = null;
  appointmentDate?: string;
  appointmentTime?: string;
  localName?: string;

  async ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token');

    if (!token) {
      this.status = 'error';
      return;
    }

    try {
      // 1. Intentar decodificar el token primero
      const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
      let tokenData: any;

      try {
        tokenData = JSON.parse(atob(base64));

        // Validar que el token tiene los campos necesarios
        if (!tokenData.t || !tokenData.a || typeof tokenData.e !== 'number') {
          console.error('Token malformado: faltan campos', tokenData);
          this.status = 'error';
          return;
        }
      } catch (decodeError) {
        console.error('Token inválido:', decodeError);
        this.status = 'error';
        return;
      }

      const { t: tenantId, a: appointmentId, e: expiresAt } = tokenData;

      // 2. Verificar expiración ANTES de buscar en DB
      if (Date.now() > expiresAt) {
        console.warn('⚠️ Enlace de cancelación expirado');
        this.status = 'expired';
        return;
      }

      // 3. Buscar cita por token
      this.appointment = await this.actionService.findByToken(token);

      if (!this.appointment) {
        // Token válido y no expirado, pero cita no existe (ya cancelada probablemente)
        console.warn('⚠️ Cita no encontrada');
        this.status = 'not-found';
        return;
      }

      // 4. Guardar datos para mostrar en la confirmación
      this.appointmentDate = this.appointment.datetime.toLocaleDateString(
        'es-ES',
        {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        },
      );

      this.appointmentTime = this.appointment.datetime.toLocaleTimeString(
        'es-ES',
        {
          hour: '2-digit',
          minute: '2-digit',
        },
      );

      this.localName = tenantId;

      // 5. Mostrar confirmación
      this.status = 'confirming';
    } catch (error) {
      console.error('Error general:', error);
      this.status = 'error';
    }
  }

  userConfirmed = false;

  async confirmCancel() {
    if (!this.userConfirmed) return;

    if (!this.appointment?.id) return;

    this.status = 'cancelling';

    try {
      await this.actionService.cancel(this.appointment.id);
      this.status = 'success';
    } catch (error) {
      console.error('Error cancelando cita:', error);
      this.status = 'error';
    }
  }

  cancelAction() {
    // Usuario decidió NO cancelar - No hacer nada (se queda en confirming)
    this.status = 'kept';
  }
}
