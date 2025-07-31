// services/admin-data.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  GalleryPhoto,
  ScheduleDay,
  ContactInfo,
  Statistics,
} from '../../types/admin.types';
@Injectable({
  providedIn: 'root',
})
export class AdminDataService {
  // Gallery Photos State
  private galleryPhotosSubject = new BehaviorSubject<GalleryPhoto[]>([
    {
      id: '1',
      url: 'assets/images/gallery/corte1.jpg',
      title: 'Corte Moderno Masculino',
      uploadDate: new Date('2024-01-15'),
    },
    {
      id: '2',
      url: 'assets/images/gallery/peinado1.jpg',
      title: 'Peinado Elegante Femenino',
      uploadDate: new Date('2024-01-20'),
    },
    {
      id: '3',
      url: 'assets/images/gallery/barba1.jpg',
      title: 'Arreglo de Barba Profesional',
      uploadDate: new Date('2024-01-25'),
    },
  ]);

  // Services State

  // Schedule State
  private scheduleSubject = new BehaviorSubject<ScheduleDay[]>([
    {
      name: 'Lunes',
      day: 'monday',
      open: '09:00',
      close: '19:00',
      closed: false,
    },
    {
      name: 'Martes',
      day: 'tuesday',
      open: '09:00',
      close: '19:00',
      closed: false,
    },
    {
      name: 'Miércoles',
      day: 'wednesday',
      open: '09:00',
      close: '19:00',
      closed: false,
    },
    {
      name: 'Jueves',
      day: 'thursday',
      open: '09:00',
      close: '19:00',
      closed: false,
    },
    {
      name: 'Viernes',
      day: 'friday',
      open: '09:00',
      close: '20:00',
      closed: false,
    },
    {
      name: 'Sábado',
      day: 'saturday',
      open: '09:00',
      close: '18:00',
      closed: false,
    },
    {
      name: 'Domingo',
      day: 'sunday',
      open: '10:00',
      close: '14:00',
      closed: true,
    },
  ]);

  // Contact Info State
  private contactInfoSubject = new BehaviorSubject<ContactInfo>({
    phone: '+34 123 456 789',
    email: 'info@peluqueriamoderna.com',
    address: 'Calle Principal, 123\n28001 Madrid, España',
  });

  // Statistics State
  private statisticsSubject = new BehaviorSubject<Statistics>({
    monthlyClients: 287,
    monthlyRevenue: 8450,
    averageRating: 4.8,
    weeklyAppointments: 68,
  });

  constructor() { }

  // Gallery Methods
  getGalleryPhotos(): Observable<GalleryPhoto[]> {
    return this.galleryPhotosSubject.asObservable();
  }

  addGalleryPhoto(photo: GalleryPhoto): void {
    const currentPhotos = this.galleryPhotosSubject.value;
    this.galleryPhotosSubject.next([photo, ...currentPhotos]);
  }

  updateGalleryPhoto(index: number, updatedPhoto: Partial<GalleryPhoto>): void {
    const currentPhotos = [...this.galleryPhotosSubject.value];
    currentPhotos[index] = { ...currentPhotos[index], ...updatedPhoto };
    this.galleryPhotosSubject.next(currentPhotos);
  }

  deleteGalleryPhoto(index: number): void {
    const currentPhotos = [...this.galleryPhotosSubject.value];
    currentPhotos.splice(index, 1);
    this.galleryPhotosSubject.next(currentPhotos);
  }

  // Services Methods


  // Schedule Methods
  getSchedule(): Observable<ScheduleDay[]> {
    return this.scheduleSubject.asObservable();
  }

  updateSchedule(schedule: ScheduleDay[]): void {
    this.scheduleSubject.next([...schedule]);
  }

  // Contact Info Methods
  getContactInfo(): Observable<ContactInfo> {
    return this.contactInfoSubject.asObservable();
  }

  updateContactInfo(contactInfo: ContactInfo): void {
    this.contactInfoSubject.next({ ...contactInfo });
  }

  // Statistics Methods
  getStatistics(): Observable<Statistics> {
    return this.statisticsSubject.asObservable();
  }

  updateStatistics(stats: Partial<Statistics>): void {
    const currentStats = this.statisticsSubject.value;
    this.statisticsSubject.next({ ...currentStats, ...stats });
  }

  // Utility Methods
  formatNumber(num: number): string {
    return num.toLocaleString('es-ES');
  }

  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateTime(open: string, close: string): boolean {
    return open < close;
  }

  // Statistics Calculations

  getRecentPhotosCount(days: number = 30): number {
    const photos = this.galleryPhotosSubject.value;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return photos.filter((photo) => photo.uploadDate > cutoffDate).length;
  }
}
