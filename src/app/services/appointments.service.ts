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
    const iso = `${yyyyMmDd}T${hhMm}:00`;
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) throw new Error('Fecha/hora inválida: ' + iso);
    return dt;
  }

  async addAppointment(appointment: Appointment): Promise<{ success: true; appointmentId: string }> {
    const appointmentsCol = collection(this.firestore, 'pruebas', 'data', 'appointments');
    const reservedCol = collection(this.firestore, 'pruebas', 'data', 'reservedSlots');
    try {
      const datetime = this.buildDateTimeFrom(appointment.date, appointment.time);
      const docRef = await addDoc(appointmentsCol, {
        ...appointment,
        datetime,
        createdAt: serverTimestamp()
      });
      await addDoc(reservedCol, {
        date: appointment.date,
        time: appointment.time,
        datetime,
        createdAt: serverTimestamp()
      });
      return { success: true, appointmentId: docRef.id };
    } catch (err: any) {
      console.error('AppointmentService.addAppointment error:', err);
      throw new Error(err?.message || 'Error añadiendo la cita');
    }
  }
}
