import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, CollectionReference } from '@angular/fire/firestore';
import { Appointment } from '../models/appointment.model';

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {

  private appointmentsCollection: CollectionReference<Appointment>;

  constructor(private firestore: Firestore) {
    this.appointmentsCollection = collection(this.firestore, 'appointments') as CollectionReference<Appointment>;
  }

  addAppointment(appointment: Appointment) {
    return addDoc(this.appointmentsCollection, appointment);
  }
}
