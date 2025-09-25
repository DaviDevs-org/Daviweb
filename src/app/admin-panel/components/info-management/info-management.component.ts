import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Barber, ContactInfo, ExceptionItem, Interval, ScheduleDay } from '../../types/admin.types';
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
  currentExceptionStep: 'date' | 'type' | 'hours' | 'complete' = 'complete';
  tempException: Partial<ExceptionItem> | null = null;
  exceptionTypes = [
    { value: 'closed', label: 'Cerrar todo el día', icon: 'bi bi-x-circle' },
    { value: 'custom', label: 'Horario especial', icon: 'bi bi-clock' }
  ];

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
      this.schedule = await this.infoManager.getSchedule();
      this.exceptions = await this.infoManager.getExceptions();
      await this.loadBarberSettings();

    } catch (error) {
      console.error('Error loading data:', error);
      this.toast.error('Error al cargar la información');
    } finally {
      this.isLoading = false;
    }
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

  // ===== EXCEPCIONES =====
  startNewException() {
    this.tempException = {
      closed: false,
      intervals: [{ open: '09:00', close: '14:00' }],
      exceptionType: undefined
    };
    this.currentExceptionStep = 'date';
  }

  validateExceptionDate(): boolean {
    if (!this.tempException?.date) {
      this.toast.error('Por favor, selecciona una fecha');
      return false;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.tempException.date)) {
      this.toast.error('Formato de fecha inválido. Use YYYY-MM-DD.');
      return false;
    }

    // Verificar duplicados
    const existing = this.exceptions.find(ex => ex.date === this.tempException!.date);
    if (existing) {
      this.toast.error('Ya existe una excepción para esta fecha');
      return false;
    }

    return true;
  }

  selectExceptionType(type: string) {
    if (!this.tempException) return;

    // Validar tipo
    if (type !== 'closed' && type !== 'custom') {
      console.error('Tipo de excepción no válido:', type);
      return;
    }

    const validType = type as 'closed' | 'custom';

    this.tempException.exceptionType = validType;
    this.tempException.closed = validType === 'closed';

    if (validType === 'closed') {
      this.tempException.intervals = [];
      // No llamar finishException automáticamente, dejar que el usuario confirme
      this.currentExceptionStep = 'hours'; // Ir al paso final para confirmar
    } else {
      this.currentExceptionStep = 'hours';
      // Asegurar que hay al menos un intervalo
      if (!this.tempException.intervals || this.tempException.intervals.length === 0) {
        this.tempException.intervals = [{ open: '09:00', close: '14:00' }];
      }
    }
  }

  addExInterval() {
    if (!this.tempException?.intervals) return;

    const newInterval = { open: '09:00', close: '14:00' };
    this.tempException.intervals.push(newInterval);

    // Validar automáticamente el nuevo intervalo
    setTimeout(() => {
      this.validateExInterval(newInterval, this.tempException!.intervals!.length - 1);
    });
  }

  removeExInterval(index: number) {
    if (!this.tempException?.intervals || this.tempException.intervals.length <= 1) {
      this.toast.error('Debe haber al menos un intervalo de horario');
      return;
    }

    this.tempException.intervals.splice(index, 1);
  }

  validateExInterval(interval: Interval, index?: number) {
    // Validar que la hora de cierre sea posterior
    if (interval.open && interval.close && interval.open >= interval.close) {
      this.toast.error('La hora de cierre debe ser posterior a la de apertura');
      interval.close = '';
      return false;
    }

    // Validar superposición solo si tenemos todos los datos y hay más de un intervalo
    if (this.tempException?.intervals && this.tempException.intervals.length > 1 &&
      interval.open && interval.close) {
      const hasOverlap = this.checkIntervalOverlap(interval, index);
      if (hasOverlap) {
        this.toast.error('Los horarios no pueden superponerse');
        return false;
      }
    }

    return true;
  }
  private checkIntervalOverlap(interval: Interval, currentIndex?: number): boolean {
    if (!this.tempException?.intervals) return false;

    for (let i = 0; i < this.tempException.intervals.length; i++) {
      // Saltar el intervalo actual si estamos editando
      if (currentIndex !== undefined && i === currentIndex) continue;

      const otherInterval = this.tempException.intervals[i];

      // Solo validar si ambos intervalos tienen horas válidas
      if (otherInterval.open && otherInterval.close && interval.open && interval.close) {
        // Verificar superposición
        const startsDuringOther = interval.open >= otherInterval.open && interval.open < otherInterval.close;
        const endsDuringOther = interval.close > otherInterval.open && interval.close <= otherInterval.close;
        const coversOther = interval.open <= otherInterval.open && interval.close >= otherInterval.close;

        if (startsDuringOther || endsDuringOther || coversOther) {
          return true;
        }
      }
    }

    return false;
  }

  async finishException() {
    if (!this.tempException?.date || !this.tempException.exceptionType) {
      this.toast.error('Completa todos los campos obligatorios');
      return;
    }

    // Validaciones para tipo custom
    if (this.tempException.exceptionType === 'custom') {
      // Verificar que hay al menos un intervalo
      if (!this.tempException.intervals || this.tempException.intervals.length === 0) {
        this.toast.error('Debe añadir al menos un intervalo horario');
        return;
      }

      // Verificar que todos los intervalos sean válidos
      const invalidInterval = this.tempException.intervals.find(i => !i.open || !i.close || i.open >= i.close);
      if (invalidInterval) {
        this.toast.error('Revisa los horarios: todos deben tener apertura y cierre válidos');
        return;
      }

      // Verificar superposiciones entre intervalos
      for (let i = 0; i < this.tempException.intervals.length; i++) {
        if (this.checkIntervalOverlap(this.tempException.intervals[i], i)) {
          this.toast.error('Hay horarios que se superponen. Corrígelos antes de guardar.');
          return;
        }
      }
    }

    const finalException: ExceptionItem = {
      date: this.tempException.date,
      closed: !!this.tempException.closed,
      intervals: this.tempException.intervals ? [...this.tempException.intervals] : [],
      exceptionType: this.tempException.exceptionType
    };

    this.exceptions.push(finalException);
    this.exceptions.sort((a, b) => a.date.localeCompare(b.date));

    try {
      await this.infoManager.saveExceptions(this.exceptions);
      this.cancelException();
      this.toast.success('Excepción guardada correctamente');
    } catch (error) {
      // Revertir en caso de error
      this.exceptions = this.exceptions.filter(ex => ex.date !== finalException.date);
      this.toast.error('Error al guardar la excepción');
    }
  }

  cancelException() {
    // Si estábamos editando una excepción (tempException tiene fecha pero no está en la lista), restaurarla
    if (this.tempException?.date) {
      const exists = this.exceptions.find(ex => ex.date === this.tempException!.date);
      if (!exists) {
        // Restaurar la excepción original
        const exceptionToRestore: ExceptionItem = {
          date: this.tempException.date,
          closed: !!this.tempException.closed,
          intervals: this.tempException.intervals || [],
          exceptionType: this.tempException.exceptionType!
        };
        this.exceptions.push(exceptionToRestore);
        this.exceptions.sort((a, b) => a.date.localeCompare(b.date));
      }
    }

    this.tempException = null;
    this.currentExceptionStep = 'complete';
  }

  async editException(index: number) {
    // Guardar la excepción original para poder restaurarla si se cancela
    const originalException = { ...this.exceptions[index] };

    this.tempException = {
      ...originalException
    };

    // Remover temporalmente de la lista
    this.exceptions.splice(index, 1);
    this.currentExceptionStep = 'hours';
  }

  async removeException(index: number) {
    if (!await this.toast.confirm('¿Seguro que desea eliminar esta excepción?')) return;

    const backup = [...this.exceptions];
    this.exceptions.splice(index, 1);

    try {
      await this.infoManager.saveExceptions(this.exceptions);
      this.toast.success('Excepción eliminada correctamente');
    } catch (err) {
      this.exceptions = backup;
      this.toast.error('Error al eliminar la excepción');
    }
  }

  // Navegación entre pasos
  nextStep() {
    if (this.currentExceptionStep === 'date' && this.validateExceptionDate()) {
      this.currentExceptionStep = 'type';
    }
  }

  prevStep() {
    if (this.currentExceptionStep === 'type') {
      this.currentExceptionStep = 'date';
    } else if (this.currentExceptionStep === 'hours') {
      this.currentExceptionStep = 'type';
    }
  }


  // ===== GUARDADO =====


  async saveContactInfo(): Promise<void> {
    try {
      await this.infoManager.saveContactInfo(this.contactInfo);
      this.toast.success('Información de contacto guardada correctamente!');
    } catch (err) { console.error(err); this.toast.error('Error al guardar la información de contacto'); }
  }

  async saveSchedule(): Promise<void> {
    try {
      await this.infoManager.saveSchedule(this.schedule);
      this.toast.success('Horario semanal guardado correctamente!');
    } catch (err) { console.error(err); this.toast.error('Error al guardar el horario semanal'); }
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

