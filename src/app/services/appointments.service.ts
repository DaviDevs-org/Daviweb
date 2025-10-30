import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';
import { Appointment } from '../admin-panel/types/admin.types';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  constructor(private firestore: Firestore) {
  }

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
      const datetime = this.buildDateTimeFrom(appointment.date, appointment.time);

      // Convertir service a objeto plano para Firestore
      const servicePlain = appointment.service ? appointment.service.toJson() : undefined;

      // Guardar appointment
      const totalDuration = appointment.service?.computeTotalTime(appointment.hairLengthChoice) || 30;
      const { service, ...rest } = appointment;
      const docRef = await addDoc(appointmentsCol, {
        ...rest,
        service: servicePlain,
        datetime,
        totalDuration,
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

      return {success: true, appointmentId: docRef.id};
    } catch (err: any) {
      console.error('AppointmentService.addAppointment error:', err);
      throw new Error(err?.message || 'Error añadiendo la cita');
    }
  }


  // Calcula los Date/HH:mm de cada slot ACTIVO (30min) teniendo en cuenta los breaks
  private computeActiveSlotDateTimes(startDateTime: Date, appointment: Appointment): { time: string; datetime: Date }[] {
    const out: { time: string; datetime: Date }[] = [];
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const service = appointment.service;
  const hairLength = appointment.hairLengthChoice;

    // Si no hay servicio, reserva el slot base (30min)
    if (!service) {
      out.push({ time: fmt(startDateTime), datetime: startDateTime });
      return out;
    }

    // Preferir segmentos específicos por longitud si existen
    // Materializar la longitud como un servicio normal si aplica
    const concrete = (service.requiresHairLength && hairLength)
      ? service.materializeForLength(hairLength)
      : service;
  const segments = concrete.timeSegments || [];

    // 1) Si hay segmentos: respetamos segmentos (creamos slots por cada bloque activo)
    if (segments.length > 0) {
      let accumulated = 0;

      segments.forEach((seg, idx) => {
        const duration = Number(seg.duration) || 0;

        // Añadir slots activos (cada 30min) dentro del segmento
        for (let m = 0; m < duration; m += 30) {
          const dt = new Date(startDateTime.getTime() + (accumulated + m) * 60000);
          out.push({ time: fmt(dt), datetime: dt });
        }

        accumulated += duration;

        // Añadir breakAfter al acumulado (no se reservan slots para el break)
        const breakAfter = Number(seg.breakAfter) || 0;
        if (breakAfter > 0 && idx < segments.length - 1) {
          accumulated += breakAfter;
        }
      });

  // No añadimos "extra" aquí: trabajamos siempre con segmentos materializados

      return out;
    }

    // 2) Si NO hay segmentos: usamos directamente el tiempo total del servicio materializado
    const totalMinutes = concrete.computeTotalTime();
    for (let m = 0; m < totalMinutes; m += 30) {
      const dt = new Date(startDateTime.getTime() + m * 60000);
      out.push({ time: fmt(dt), datetime: dt });
    }

    return out;
  }

}
