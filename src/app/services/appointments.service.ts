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

      // Convertir service a objeto plano para Firestore
      const servicePlain = appointment.service ? appointment.service.toJson() : undefined;

      // Guardar appointment
      const docRef = await addDoc(appointmentsCol, {
        ...appointment,
        service: servicePlain,
        datetime,
        createdAt: serverTimestamp()
      });

      // Guardar reserved slots por cada segmento ACTIVO de 30min
      const slots = this.computeActiveSlotDateTimes(datetime, appointment);
      await Promise.all(slots.map(s => addDoc(reservedCol, {
        date: appointment.date,
        time: s.time,
        datetime: s.datetime,
        appointmentId: docRef.id,
        createdAt: serverTimestamp()
      })));

      return { success: true, appointmentId: docRef.id };
    } catch (err: any) {
      console.error('AppointmentService.addAppointment error:', err);
      throw new Error(err?.message || 'Error añadiendo la cita');
    }
  }


  // Calcula los Date/HH:mm de cada slot ACTIVO (30min) teniendo en cuenta los breaks
  private computeActiveSlotDateTimes(startDateTime: Date, appointment: Appointment): { time: string; datetime: Date }[] {
    const out: { time: string; datetime: Date }[] = [];

    // Helper para formatear HH:mm
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    // Si hay estructura de segmentos en el servicio, respetarla
    const segments = appointment?.service?.timeSegments;
    if (segments && Array.isArray(segments) && segments.length > 0) {
      let accumulated = 0; // minutos desde el inicio
      segments.forEach((seg: any, idx: number) => {
        const duration = Number(seg?.duration) || 0;
        // Añadir slots activos cada 30min dentro del segmento
        for (let m = 0; m < duration; m += 30) {
          const dt = new Date(startDateTime.getTime() + (accumulated + m) * 60000);
          out.push({ time: fmt(dt), datetime: dt });
        }
        accumulated += duration;
        const breakAfter = Number(seg?.breakAfter) || 0;
        // Sumar break al acumulado (pero no reservar esos slots) si no es el último segmento
        if (breakAfter > 0 && idx < segments.length - 1) {
          accumulated += breakAfter;
        }
      });
      return out;
    }

    // Fallback: si no hay segmentos, reservar solo el slot inicial (30min)
    out.push({ time: fmt(startDateTime), datetime: startDateTime });
    return out;
  }
}
