import { Injectable } from '@angular/core';
import { BookingStrategy } from './booking.strategy';
import { GlobalBookingStrategy } from './global-booking.strategy';
import { BarberBookingStrategy } from './barber-booking.strategy';

@Injectable({ providedIn: 'root' })
export class BookingStrategyFactory {
  constructor(
    private globalStrategy: GlobalBookingStrategy,
    private barberStrategy: BarberBookingStrategy
  ) {}

  getStrategy(barberSelection: boolean): BookingStrategy {
    return barberSelection ? this.barberStrategy : this.globalStrategy;
  }
}
