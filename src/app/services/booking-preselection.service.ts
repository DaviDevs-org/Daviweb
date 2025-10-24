import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BookingPreselection {
  serviceName?: string;
  barberName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BookingPreselectionService {
  private preselectionSubject = new BehaviorSubject<BookingPreselection>({});
  public preselection$ = this.preselectionSubject.asObservable();

  setService(serviceName: string) {
    const current = this.preselectionSubject.value;
    this.preselectionSubject.next({ ...current, serviceName });
  }

  setBarber(barberName: string) {
    const current = this.preselectionSubject.value;
    this.preselectionSubject.next({ ...current, barberName });
  }

  setBoth(serviceName: string, barberName: string) {
    this.preselectionSubject.next({ serviceName, barberName });
  }

  getPreselection(): BookingPreselection {
    return this.preselectionSubject.value;
  }

  clearPreselection() {
    this.preselectionSubject.next({});
  }
}
