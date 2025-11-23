import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideClientHydration } from '@angular/platform-browser';
import { AppointmentRepository } from '@application/appointments';
import { BusinessInfoRepository } from '@application/business-info';

export const appConfig: ApplicationConfig = {
  providers: 
    [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), 
    provideFirebaseApp(() => initializeApp({ 
      projectId: "daviweb-3b415", 
      appId: "1:835985113850:web:c3645c905f7eb579823f43", 
      storageBucket: "daviweb-3b415.firebasestorage.app", 
      apiKey: "AIzaSyDdSdy08ZYN2Tqgub-Cg9hFg0hUUMEyfK0", 
      authDomain: "daviweb-3b415.firebaseapp.com", 
      messagingSenderId: "835985113850", 
      measurementId: "G-P0HMFQM2TM" })), 
    provideAuth(() => getAuth()), 
    provideFirestore(() => getFirestore()), 
    provideStorage(() => getStorage()),
    provideClientHydration(),
    {provide: AppointmentRepository, useClass: FirebaseAppointmentRepository},
    {provide: BusinessInfoRepository, useClass: FirebaseBusinessInfoRepository}
  ]
};
