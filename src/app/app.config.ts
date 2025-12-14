import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { environment } from './environments/environment';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { provideClientHydration } from '@angular/platform-browser';
import { AppointmentRepository } from '@application/appointments';
import { BusinessInfoRepository, ScheduleRepository } from '@application/business';
import { ServiceRepository } from '@application/services';
import { GalleryRepository } from '@application/gallery';
import { FirebaseAppointmentRepository } from '@infrastructure/firebase/appointments/firebase-appointment.repository';
import { FirebaseBusinessInfoRepository } from '@infrastructure/firebase/business/firebase-business-info.repository';
import { FirebaseScheduleRepository } from '@infrastructure/firebase/business/firebase-schedule.repository';
import { FirebaseServiceRepository } from '@infrastructure/firebase/services/firebase-service.repository';
import { FirebaseGalleryRepository } from '@infrastructure/firebase/gallery/firebase-gallery.repository';

export const appConfig: ApplicationConfig = {
  providers:
    [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage()),
    provideClientHydration(),
    {provide: AppointmentRepository, useClass: FirebaseAppointmentRepository},
    {provide: BusinessInfoRepository, useClass: FirebaseBusinessInfoRepository},
    {provide: ScheduleRepository, useClass: FirebaseScheduleRepository},
    {provide: ServiceRepository, useClass: FirebaseServiceRepository},
    {provide: GalleryRepository, useClass: FirebaseGalleryRepository}
  ]
};
