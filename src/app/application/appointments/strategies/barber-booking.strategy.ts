import { Injectable } from '@angular/core';
import { BookingStrategy, BookingResult } from './booking.strategy';
import { Appointment, ReservedSlot } from '@domain/index';
import { AppointmentRepository } from '@application/appointments/appointment.repository.interface';
import { ScheduleRepository, GetBarberSettingsUseCase } from '@application/business';
import { GetAvailableSlotsForDayService } from '@domain/business-info/availability/get-available-slots-for-day.service';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BarberBookingStrategy implements BookingStrategy {
  constructor(
    private appointmentRepository: AppointmentRepository,
    private scheduleRepository: ScheduleRepository,
    private getAvailableSlotsService: GetAvailableSlotsForDayService,
    private getBarberSettingsUseCase: GetBarberSettingsUseCase
  ) {}

  async execute(appointment: Appointment): Promise<BookingResult> {
    if (!appointment.barberId) {
      throw new Error('Barber ID is required for barber booking strategy');
    }

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

    // 2. Fetch data
    const [schedule, exceptions, reservedSlots, barberSettings] = await Promise.all([
      firstValueFrom(this.scheduleRepository.getSchedule()),
      firstValueFrom(this.scheduleRepository.getExceptions()),
      firstValueFrom(this.scheduleRepository.getSlots()),
      firstValueFrom(this.getBarberSettingsUseCase.execute())
    ]);

    // 3. Find barber and determine schedule
    const barber = barberSettings.barbers.find(b => b.id === appointment.barberId);
    if (!barber) {
        throw new Error(`Barber with ID ${appointment.barberId} not found`);
    }
    
    if (!barber.isAvailable) {
        throw new Error(`Barber ${barber.name} is not available`);
    }

    const effectiveSchedule = barber.schedule && barber.schedule.length > 0 ? barber.schedule : schedule;

    // 4. Filter reserved slots for this barber + global slots
    const relevantSlots = reservedSlots.filter(slot => 
        slot.barberId === appointment.barberId || slot.barberId === null || slot.barberId === undefined
    );

    // 5. Check availability
    const availableSlots = this.getAvailableSlotsService.execute(
      appointment.datetime,
      effectiveSchedule,
      exceptions,
      relevantSlots
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
            `El horario ${timeStr} no está disponible para el barbero ${barber.name}.`
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

    // 6. Add appointment
    const appointmentId = await this.appointmentRepository.addAppointment(
      appointment
    );

    // 7. Reserve slots with barberId
    const reservationPromises = slotsToReserve.map((slotDate) => {
      const reservedSlot = new ReservedSlot(
        appointmentId,
        slotDate,
        undefined,
        appointment.barberId
      );
      return this.scheduleRepository.addSlot(reservedSlot);
    });

    await Promise.all(reservationPromises);

    return { appointmentId };
  }
}
