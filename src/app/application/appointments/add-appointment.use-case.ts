import { Appointment, ReservedSlot } from '@domain/index';
import { AppointmentRepository } from '@application/appointments/appointment.repository.interface';
import { Injectable } from '@angular/core';
import { GetAvailableSlotsForDayUseCase } from '@application/business/schedule/slots/get-available-slots-for-day.use-case';
import { ScheduleRepository } from '@application/business';
import { firstValueFrom } from 'rxjs';
import { Service } from '@domain/services/service.entity';

@Injectable({ providedIn: 'root' })
export class AddAppointmentUseCase {
  constructor(
    private appointmentRepository: AppointmentRepository,
    private getAvailableSlotsUseCase: GetAvailableSlotsForDayUseCase,
    private scheduleRepository: ScheduleRepository
  ) {}

  async execute(appointment: Appointment): Promise<void> {
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

    // 2. Check availability and calculate slots to reserve
    const availableSlots = await firstValueFrom(
      this.getAvailableSlotsUseCase.execute(appointment.datetime)
    );

    let currentMinutes =
      appointment.datetime.getHours() * 60 + appointment.datetime.getMinutes();
    const slotsToReserve: Date[] = [];

    for (const segment of segments) {
      // Process active duration
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

        // Create Date object for this slot
        const slotDate = new Date(appointment.datetime);
        slotDate.setHours(h, m, 0, 0);
        slotsToReserve.push(slotDate);

        currentMinutes += 30;
      }

      // Process break (just advance time, don't reserve or check availability)
      if (segment.breakAfter && segment.breakAfter > 0) {
        currentMinutes += segment.breakAfter;
      }
    }

    // 3. Add appointment
    const appointmentId = await this.appointmentRepository.addAppointment(
      appointment
    );

    // 4. Reserve slots
    const reservationPromises = slotsToReserve.map((slotDate) => {
      const reservedSlot = new ReservedSlot(appointmentId, slotDate);
      return this.scheduleRepository.addSlot(reservedSlot);
    });

    await Promise.all(reservationPromises);
  }
}
