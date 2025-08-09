// src/app/services/appointments.service.ts
import { Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export interface Appointment {
  date: string;
  time: string;
  name: string;
  email?: string;
  phone?: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private addAppointmentFn: (data: any) => Promise<any>;

  constructor(private functions: Functions) {
    // httpsCallable devuelve una función que devuelve Promise en la SDK moderna
    this.addAppointmentFn = httpsCallable(this.functions, 'addAppointment') as any;
  }

  // Ahora devuelve una Promise para que `await` funcione como es debido
  addAppointment(appointment: Appointment): Promise<any> {
    return this.addAppointmentFn(appointment);
  }
}
