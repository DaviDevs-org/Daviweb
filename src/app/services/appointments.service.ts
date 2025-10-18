import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { Appointment } from '../admin-panel/types/admin.types';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  constructor(private firestore: Firestore) {}

  private buildDateTimeFrom(yyyyMmDd: string | undefined, hhMm: string | undefined): Date {
    if (!yyyyMmDd || !hhMm) throw new Error('Faltan date o time');
    // Formato ISO local: "YYYY-MM-DDTHH:MM:SS"
    const iso = `${yyyyMmDd}T${hhMm}:00`;
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) throw new Error('Fecha/hora inválida: ' + iso);
    return dt;
  }

  async addAppointment(appointment: Appointment): Promise<{ success: true; appointmentId: string }> {
    const appointmentsCol = collection(this.firestore, 'pruebas', 'data', 'appointments');
    const reservedCol = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');

    try {
      // Validación y construcción de datetime
      const datetime = this.buildDateTimeFrom(appointment.date, appointment.time);

      // Guardar appointment (puedes incluir datetime aquí si lo deseas)
      const docRef = await addDoc(appointmentsCol, {
        ...appointment,
        datetime,
        createdAt: serverTimestamp()
      });

      // Guardar reserved slot (campo datetime necesario para consultas "desde ahora")
      await addDoc(reservedCol, {
        date: appointment.date,
        time: appointment.time,
        datetime,
        createdAt: serverTimestamp()
      });

      return { success: true, appointmentId: docRef.id };
    } catch (err: any) {
      // lanza el error para que el caller lo capture y muestre el mensaje adecuado
      console.error('AppointmentService.addAppointment error:', err);
      throw new Error(err?.message || 'Error añadiendo la cita');
    }
  }
}
