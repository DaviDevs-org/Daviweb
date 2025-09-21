import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvailabilityData, Barber, ContactInfo, ExceptionItem, Interval, ScheduleDay } from '../../types/admin.types';
import { InfoManager } from '../../../services/admin-panel/info-management.service';
import { ElementRef, ViewChild, inject, signal } from '@angular/core';
import { percentage } from '@angular/fire/storage';
import { Subscription } from 'rxjs';
import { GalleryService } from '../../../services/admin-panel/gallery-management.service';
import { AlertService } from '../../../services/alert/alert.service';

@Component({
  selector: 'app-info-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./info-management.component.html",
  styleUrls: ['./info-management.component.scss']
})
export class InfoManagementComponent implements OnInit {
  schedule: ScheduleDay[] = [];
  contactInfo: ContactInfo = { phone: '', email: '', address: '' };
  exceptions: ExceptionItem[] = [];

  barberSettings: any = { settings: { barberSelection: false, staff: [] }, barberSelection: false, staff: [] };
  @ViewChild('barberFileInput') barberFileInput!: ElementRef<HTMLInputElement>;

  private galleryService = inject(GalleryService);
  private toast = inject(AlertService);

  selectedBarberFile: File | null = null;
  barberImagePreviewUrl: string = '';
  barberUploadProgress = signal('0%');
  isBarberUploading: boolean = false;
  barberUploadSubscription: Subscription | undefined = undefined;

  isBarberLoading = true;
  isLoading = true;

  constructor(private infoManager: InfoManager) { }

  async ngOnInit() {
    try {
      this.contactInfo = await this.infoManager.getContactInfo();
      const availability = await this.infoManager.getAvailability();

      if (availability?.defaultSchedule) this.applyDefaultScheduleToLocal(availability.defaultSchedule);
      this.exceptions = this.mapExceptionsToArray(availability?.exceptions || {});
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.isLoading = false;
    }

    await this.loadBarberSettings();
  }

  // ===== HORARIOS SEMANALES =====
  applyDefaultScheduleToLocal(defaultSchedule: Record<string, any>) {
    const dayOrder = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    this.schedule = dayOrder.map((key, idx) => {
      const src = defaultSchedule[key] || {};
      let intervals: Interval[] = [];
      if (Array.isArray(src.intervals) && src.intervals.length) intervals = src.intervals.map((i: any) => ({ open: i.open || '', close: i.close || '' }));
      return { day: key, name: names[idx], closed: !!src.closed, intervals } as ScheduleDay;
    });
  }

  addInterval(day: ScheduleDay) { day.intervals.push({ open: '', close: '' }); }
  removeInterval(day: ScheduleDay, i: number) { day.intervals.splice(i, 1); }
  validateInterval(day: ScheduleDay, interval: Interval) {
    if (!day.closed && interval.open && interval.close && interval.open >= interval.close) interval.close = '';
  }
  onToggleDayClosed(day: ScheduleDay) { if (day.closed) day.intervals = []; else if (!day.intervals.length) day.intervals.push({ open: '', close: '' }); }
  transformScheduleToDefault(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const d of this.schedule) out[d.day] = { closed: !!d.closed, intervals: d.intervals.map(i => ({ open: i.open, close: i.close })) };
    return out;
  }

  // ===== EXCEPCIONES POR FECHA =====
  mapExceptionsToArray(obj: Record<string, any>): ExceptionItem[] {
    return Object.keys(obj).sort().map(dateKey => {
      const item = obj[dateKey];
      let intervals: Interval[] = [];
      if (!item.closed && Array.isArray(item.hours) && item.hours.length) {
        intervals = item.hours.map((h: string) => {
          const [open, close] = h.split('-');
          return { open: open || '', close: close || '' };
        });
      }
      return { date: dateKey, closed: !!item.closed, intervals } as ExceptionItem;
    });
  }

  addEmptyException() { this.exceptions.push({ date: null, closed: false, intervals: [{ open: '', close: '' }] }); }

  async removeException(i: number) {
    if (await !this.toast.confirm('¿Seguro que desea eliminar esta excepción?')) return;

    const backup = [...this.exceptions];
    this.exceptions.splice(i, 1);

    try {
      await this.saveAvailability(false);
    } catch (err) {
      this.exceptions = backup;
      this.toast.error('Error al eliminar la excepción en el servidor. Se ha restaurado el estado anterior.');
    }
  }

  onExceptionToggleClosed(ex: ExceptionItem) {
    if (ex.closed) ex.intervals = [];
    else if (!ex.intervals.length) ex.intervals.push({ open: '', close: '' });
    void this.saveAvailability(false);
  }

  addExInterval(ex: ExceptionItem) {
    ex.intervals.push({ open: '', close: '' });
    void this.saveAvailability(false);
  }

  removeExInterval(ex: ExceptionItem, i: number) {
    ex.intervals.splice(i, 1);
    void this.saveAvailability(false);
  }

  validateExInterval(ex: ExceptionItem, interval: Interval) {
    if (!ex.closed && interval.open && interval.close && interval.open >= interval.close) interval.close = '';
    void this.saveAvailability(false);
  }

  onExceptionDateChange(ex: ExceptionItem) {
    if (ex.date && !/^\d{4}-\d{2}-\d{2}$/.test(ex.date)) {
      this.toast.error('Formato de fecha inválido. Use YYYY-MM-DD.');
      return;
    }
    if (ex.date) void this.saveAvailability(false);
  }

  transformExceptionsToObject(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const ex of this.exceptions) {
      if (!ex.date) continue;
      out[ex.date] = ex.closed ? { closed: true, hours: [] } : { closed: false, hours: ex.intervals.map(i => `${i.open}-${i.close}`) };
    }
    return out;
  }

  // ===== GUARDADO =====
  async saveAvailability(showAlert: boolean = true): Promise<void> {
    try {
      const payload: AvailabilityData = {
        defaultSchedule: this.transformScheduleToDefault(),
        exceptions: this.transformExceptionsToObject()
      };
      await this.infoManager.saveAvailability(payload);
      if (showAlert) this.toast.success('Disponibilidad guardada correctamente!');
    } catch (err) {
      console.error(err);
      if (showAlert) this.toast.success('❌ Error al guardar la disponibilidad');
      else throw err;
    }
  }

  async saveContactInfo(): Promise<void> {
    try {
      await this.infoManager.saveContactInfo(this.contactInfo);
      this.toast.success('Información de contacto guardada correctamente!');
    } catch (err) { console.error(err); this.toast.error('Error al guardar la información de contacto'); }
  }

  getDayStatus(day: ScheduleDay): string { if (day.closed) return 'Cerrado'; return day.intervals.map(i => `${i.open}-${i.close}`).join(', '); }

  // ===== BARBER SETTINGS =====

  async loadBarberSettings() {
    this.isBarberLoading = true;
    try {
      const settings = await this.infoManager.getBarberSettings();

      if ((settings as any).settings) {
        this.barberSettings.settings = settings.settings;
        this.barberSettings.barberSelection = settings.settings.barberSelection;
        this.barberSettings.staff = settings.settings.staff;
      } else {
        const legacy = settings as any;
        this.barberSettings.settings = { barberSelection: !!legacy.barberSelection, staff: legacy.staff ?? [] };
        this.barberSettings.barberSelection = this.barberSettings.settings.barberSelection;
        this.barberSettings.staff = this.barberSettings.settings.staff;
      }
    } catch (err) {
      console.error('Error cargando peluqueros', err);
      this.toast.error('Error cargando los peluqueros')
      this.barberSettings = { settings: { barberSelection: false, staff: [] }, barberSelection: false, staff: [] };
    } finally {
      this.isBarberLoading = false;
    }
  }

  // Guardar configuración completa (botón "Guardar configuración")
  async saveBarberSettings() {
    try {
      // Persistimos la forma anidada (service espera settings object)
      const settingsPayload = {
        barberSelection: !!this.barberSettings.settings.barberSelection,
        staff: this.barberSettings.settings.staff ?? []
      };
      await this.infoManager.saveBarberSettings(settingsPayload);

      // mantenemos sincronía top-level para la UI
      this.barberSettings.barberSelection = settingsPayload.barberSelection;
      this.barberSettings.staff = settingsPayload.staff;

      this.toast.success('Configuración de peluqueros guardada correctamente!');
    } catch (err) {
      console.error(err);
      this.toast.error('Error al guardar la configuración de peluqueros');
    }
  }

  async toggleBarberSelection() {
    try {
      const newVal = !!this.barberSettings.settings.barberSelection;
      await this.infoManager.updateBarberSelection(newVal);
      this.barberSettings.barberSelection = newVal; // sincronizar top-level
    } catch (err) {
      console.error(err);
    }
  }

  async addBarber(name: string) {
    const n = name?.trim();
    if (!n) return;

    if (!this.selectedBarberFile) {
      this.toast.error('Por favor, selecciona una imagen para el peluquero.');
      return;
    }

    try {
      const imageUrl = await this.uploadBarberImageIfSelected();
      const newBarber: Barber = {
        id: crypto.randomUUID(),
        name: n,
        visible: true,
        imageUrl: imageUrl || undefined
      };

      await this.infoManager.addBarber(newBarber);
      this.barberSettings.settings.staff.push(newBarber);
      this.toast.success('Peluquero añadido correctamente!');
    } catch (err) {
      console.error(err);
      this.toast.error('Error al añadir el peluquero.');
    }
  }



  async removeBarber(barber: Barber) {
    if (await !this.toast.confirm(`¿Seguro que quieres eliminar a ${barber.name}?`)) return;
    try {
      await this.infoManager.removeBarber(barber);
      this.barberSettings.settings.staff = this.barberSettings.settings.staff.filter((b: Barber) => b.id !== barber.id);
      this.barberSettings.staff = this.barberSettings.staff.filter((b: Barber) => b.id !== barber.id);
    } catch (err) {
      console.error(err);
    }
  }


  async onToggleBarberVisible(barber: Barber, newVisible: boolean) {
    const updatedBarber = { ...barber, visible: newVisible };
    try {
      await this.infoManager.editBarber(barber, updatedBarber);

      const idx = this.barberSettings.settings.staff.findIndex((b: Barber) => b.id === barber.id);
      if (idx !== -1) this.barberSettings.settings.staff[idx] = updatedBarber;

      const idx2 = this.barberSettings.staff.findIndex((b: Barber) => b.id === barber.id);
      if (idx2 !== -1) this.barberSettings.staff[idx2] = updatedBarber;
    } catch (err) {
      console.error('Error toggling barber visible', err);
      this.toast.error('Error al cambiar visibilidad del peluquero');
    }
  }
  onBarberFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      if (!allowedTypes.includes(file.type)) {
        this.toast.error('Por favor, selecciona una imagen JPG, PNG o WebP.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.toast.error('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }

      if (this.barberImagePreviewUrl) {
        URL.revokeObjectURL(this.barberImagePreviewUrl);
      }

      this.selectedBarberFile = file;
      this.barberImagePreviewUrl = URL.createObjectURL(file);
    }
  }
  private async uploadBarberImageIfSelected(): Promise<string | null> {
    if (!this.selectedBarberFile) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const task = this.galleryService.uploadBarberImage(this.selectedBarberFile!);
      if (!task) {
        reject('Error al iniciar la subida');
        return;
      }

      if (this.barberUploadSubscription) {
        this.barberUploadSubscription.unsubscribe();
        this.barberUploadSubscription = undefined;
      }

      this.isBarberUploading = true;
      this.barberUploadSubscription = percentage(task).subscribe(({ progress }) => {
        this.barberUploadProgress.set(`${progress}%`);
      });

      task.on('state_changed',
        null,
        (error) => {
          console.error('Error al subir:', error);
          this.isBarberUploading = false;
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await this.galleryService.getUrl(task.snapshot.ref);
            this.isBarberUploading = false;
            this.barberUploadProgress.set('0%');
            this.clearBarberFileSelection();
            resolve(downloadURL);
          } catch (error) {
            this.isBarberUploading = false;
            reject(error);
          }
        }
      );
    });
  }
  private clearBarberFileSelection(): void {
    this.selectedBarberFile = null;

    if (this.barberImagePreviewUrl) {
      URL.revokeObjectURL(this.barberImagePreviewUrl);
      this.barberImagePreviewUrl = '';
    }

    if (this.barberFileInput) {
      this.barberFileInput.nativeElement.value = '';
    }
  }
  ngOnDestroy() {
    if (this.barberImagePreviewUrl) {
      URL.revokeObjectURL(this.barberImagePreviewUrl);
    }

    if (this.barberUploadSubscription) {
      this.barberUploadSubscription.unsubscribe();
    }
  }
}

