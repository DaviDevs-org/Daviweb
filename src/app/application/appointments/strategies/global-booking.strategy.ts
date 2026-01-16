import { Injectable } from '@angular/core';
import { BookingStrategy, BookingResult } from './booking.strategy';
import { Appointment, ReservedSlot } from '@domain/index';
import { AppointmentRepository } from '@application/appointments/appointment.repository.interface';
import { ScheduleRepository } from '@application/business';
import { GetAvailableSlotsForDayService } from '@domain/business-info/availability/get-available-slots-for-day.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GlobalBookingStrategy implements BookingStrategy {
  constructor(
    private appointmentRepository: AppointmentRepository,
    private scheduleRepository: ScheduleRepository,
    private getAvailableSlotsService: GetAvailableSlotsForDayService
  ) {}

  async execute(appointment: Appointment): Promise<BookingResult> {
    // 1. Get segments
    let segments = appointment.service.timeSegments;
    if (
      appointment.hairLengthChoice &&
      appointment.service.hairLengthModifiers
    ) {
      const mod =
        appointment.service.hairLengthModifiers[appointment.hairLengthChoice];
      if (mod && mod.segments && mod.segments.length > 0) {
        segments = mod.segments;
      } else if (mod && mod.time) {
        segments = [{ duration: mod.time, breakAfter: 0 }];
      }
    }

    if (!segments || segments.length === 0) {
      segments = [{ duration: 30, breakAfter: 0 }];
    }

    // 2. Fetch data for availability
    const [schedule, exceptions, reservedSlots] = await Promise.all([
      firstValueFrom(this.scheduleRepository.getSchedule()),
      firstValueFrom(this.scheduleRepository.getExceptions()),
      firstValueFrom(this.scheduleRepository.getSlots()),
    ]);

    // 3. Check availability
    const availableSlots = this.getAvailableSlotsService.execute(
      appointment.datetime,
      schedule,
      exceptions,
      reservedSlots
    );

    let currentMinutes =
      appointment.datetime.getHours() * 60 + appointment.datetime.getMinutes();
    const slotsToReserve: Date[] = [];

    for (const segment of segments) {
      const durationSlots = Math.ceil(segment.duration / 30);
      for (let i = 0; i < durationSlots; i++) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(
          2,
          '0'
        )}`;

        if (!availableSlots.includes(timeStr)) {
          throw new Error(
            `El horario ${timeStr} no está disponible para la duración del servicio.`
          );
        }

        const slotDate = new Date(appointment.datetime);
        slotDate.setHours(h, m, 0, 0);
        slotsToReserve.push(slotDate);

        currentMinutes += 30;
      }

      if (segment.breakAfter && segment.breakAfter > 0) {
        currentMinutes += segment.breakAfter;
      }
    }

    // 4. Add appointment
    const appointmentId = await this.appointmentRepository.addAppointment(
      appointment
    );

    // 5. Reserve slots (Global mode: barberId = null)
    const reservationPromises = slotsToReserve.map((slotDate) => {
      const reservedSlot = new ReservedSlot(
        appointmentId,
        slotDate,
        undefined,
        null
      );
      return this.scheduleRepository.addSlot(reservedSlot);
    });

    await Promise.all(reservationPromises);

    return { appointmentId };
  }
}
