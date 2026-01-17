import { inject, Injectable } from '@angular/core';
import { doc, Firestore, getDoc } from '@angular/fire/firestore';
import { Appointment, AppointmentDTO } from '@domain/appointments';
import { FirebaseAppointmentRepository } from '@infrastructure/firebase/appointments/firebase-appointment.repository';
import { Timestamp } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root',
})
export class AppointmentActionService {
  private firestore = inject(Firestore);
  private appointmentRepo = inject(FirebaseAppointmentRepository);

  /**
   * Find an appointment by its cancellation token
   */
  async findByToken(encodedToken: string): Promise<Appointment | null> {
    try {
      // Decode token base64url
      const base64 = encodedToken.replace(/-/g, '+').replace(/_/g, '/');
      const tokenData = JSON.parse(atob(base64));

      const { t: tenantId, a: appointmentId, e: expiresAt } = tokenData;

      // Verify expiration (24h before the appointment)
      if (Date.now() > expiresAt) {
        console.warn(
          '⚠️ Enlace de cancelación expirado (debe cancelar con 24h de antelación)',
        );
        return null;
      }

      // Direct query by ID (super efficient)
      const docRef = doc(
        this.firestore,
        `hairdressers/${tenantId}/appointments/${appointmentId}`,
      );

      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        console.warn('⚠️ Cita no encontrada o ya cancelada');
        return null;
      }

      const data = docSnap.data();
      return this.mapToDomain({ ...data, id: docSnap.id });
    } catch (error) {
      console.error('❌ Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Cancela una cita por su ID
   */
  async cancel(appointmentId: string): Promise<void> {
    try {
      await this.appointmentRepo.deleteAppointment(appointmentId);
      console.log(`✅ Cita ${appointmentId} cancelada`);
    } catch (error) {
      console.error('❌ Error cancelando cita:', error);
      throw error;
    }
  }

  /**
   * Map data from Firestore to Appointment entity
   */
  private mapToDomain(data: any): Appointment {
    const datetime =
      data.datetime instanceof Timestamp
        ? data.datetime.toDate()
        : typeof data.datetime === 'string'
          ? new Date(data.datetime)
          : data.datetime;

    const createdAt =
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : typeof data.createdAt === 'string'
          ? new Date(data.createdAt)
          : data.createdAt || new Date();

    const dto: AppointmentDTO = {
      ...data,
      datetime,
      createdAt,
    };

    return Appointment.fromDTO(dto, data.id);
  }
}
