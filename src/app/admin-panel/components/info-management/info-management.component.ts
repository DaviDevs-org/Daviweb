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
import { ImageProcessingService } from '../../../services/image-processing.service';

@Component({
  selector: 'app-info-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./info-management.component.html",
  styleUrls: ['./info-management.component.scss']
})
export class InfoManagementComponent implements OnInit {
  schedule: ScheduleDay[] = [];
  contactInfo: ContactInfo = { phone: '', address: '' };
  exceptions: ExceptionItem[] = [];
  currentExceptionStep: 'date' | 'type' | 'hours' | 'complete' = 'complete';
  tempException: Partial<ExceptionItem> | null = null;
  exceptionTypes = [
    { value: 'closed', label: 'Cerrar todo el día', icon: 'bi bi-x-circle' },
    { value: 'custom', label: 'Horario especial', icon: 'bi bi-clock' },
    { value: 'range', label: 'Cerrar varios días', icon: 'bi bi-calendar-range' }
  ];

  barberSettings: any = { settings: { barberSelection: false, staff: [] }, barberSelection: false, staff: [] };
  @ViewChild('barberFileInput') barberFileInput!: ElementRef<HTMLInputElement>;

  private galleryService = inject(GalleryService);
  private toast = inject(AlertService);
  private imageProcessor = inject(ImageProcessingService);

  selectedBarberFile: File | null = null;
  processedBarberBlob: Blob | null = null;
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

  // Método para obtener excepciones agrupadas (para mejor visualización de rangos)
  getGroupedExceptions(): ExceptionItem[] {
    const grouped: ExceptionItem[] = [];
    const processedRanges = new Set<string>();

    for (const ex of this.exceptions) {
      if (ex.exceptionType === 'range' && ex.startDate && ex.endDate) {
        const rangeKey = `${ex.startDate}-${ex.endDate}`;
        
        // Si ya procesamos este rango, saltar
        if (processedRanges.has(rangeKey)) continue;
        
        processedRanges.add(rangeKey);
        
        // Añadir solo la primera excepción del rango (representa todo el rango)
        grouped.push(ex);
      } else {
        // Excepciones individuales (closed, custom)
        grouped.push(ex);
      }
    }

    return grouped;
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

  addInterval(day: ScheduleDay) {
    // Si el día está cerrado, no permitir añadir intervalos
    if (day.closed) return;

    day.intervals.push({ open: '09:00', close: '14:00' });
  }
  removeInterval(day: ScheduleDay, i: number) { day.intervals.splice(i, 1); }
  validateInterval(day: ScheduleDay, interval: Interval) {
    if (!day.closed && interval.open && interval.close && interval.open >= interval.close) interval.close = '';
  }
  onToggleDayClosed(day: ScheduleDay) {
    if (day.closed) {
      // GUARDAR los intervalos actuales antes de limpiar
      if (!day.hasOwnProperty('backupIntervals')) {
        (day as any).backupIntervals = [...day.intervals];
      }
      day.intervals = [];
    } else {
      // RESTAURAR los intervalos guardados, o usar uno por defecto si no hay backup
      if ((day as any).backupIntervals && (day as any).backupIntervals.length > 0) {
        day.intervals = [...(day as any).backupIntervals];
      } else if (!day.intervals.length) {
        day.intervals.push({ open: '09:00', close: '14:00' });
      }
      // Limpiar el backup después de restaurar
      delete (day as any).backupIntervals;
    }
  }
  getScheduleRowClass(day: ScheduleDay): string {
    return day.closed ? 'schedule-row closed-day' : 'schedule-row';
  }
  transformScheduleToDefault(): Record<string, any> {
    const out: Record<string, any> = {};
    for (const d of this.schedule) out[d.day] = { closed: !!d.closed, intervals: d.intervals.map(i => ({ open: i.open, close: i.close })) };
    return out;
  }

  // ===== EXCEPCIONES =====
  startNewException() {
    this.tempException = {
      date: '', // Se usa solo para tipos 'closed' y 'custom'
      closed: false,
      intervals: [{ open: '09:00', close: '14:00' }],
      exceptionType: undefined,
      startDate: undefined, // Para tipo 'range'
      endDate: undefined     // Para tipo 'range'
    };
    // Saltamos directamente al paso de tipo
    this.currentExceptionStep = 'type';
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
    if (type !== 'closed' && type !== 'custom' && type !== 'range') {
      console.error('Tipo de excepción no válido:', type);
      return;
    }

    const validType = type as 'closed' | 'custom' | 'range';

    this.tempException.exceptionType = validType;
    this.tempException.closed = validType === 'closed' || validType === 'range';

    if (validType === 'closed' || validType === 'custom') {
      // Para closed y custom, necesitamos seleccionar una fecha individual primero
      this.currentExceptionStep = 'date';
      if (validType === 'closed') {
        this.tempException.intervals = [];
      } else {
        // Asegurar que hay al menos un intervalo para custom
        if (!this.tempException.intervals || this.tempException.intervals.length === 0) {
          this.tempException.intervals = [{ open: '09:00', close: '14:00' }];
        }
      }
    } else if (validType === 'range') {
      // Para rangos, ir directamente al paso de configuración de fechas
      this.tempException.intervals = [];
      this.currentExceptionStep = 'hours';
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
    if (!this.tempException?.exceptionType) {
      this.toast.error('Completa todos los campos obligatorios');
      return;
    }

    // Validaciones específicas por tipo
    if (this.tempException.exceptionType === 'range') {
      // Para tipo 'range' necesitamos startDate y endDate
      if (!this.tempException.startDate || !this.tempException.endDate) {
        this.toast.error('Debes seleccionar una fecha de inicio y fin');
        return;
      }

      // Validar que la fecha de inicio sea anterior o igual a la de fin
      if (this.tempException.startDate > this.tempException.endDate) {
        this.toast.error('La fecha de inicio debe ser anterior o igual a la fecha de fin');
        return;
      }

      // Crear múltiples excepciones, una por cada día en el rango
      const exceptionsToAdd: ExceptionItem[] = [];
      const start = new Date(this.tempException.startDate);
      const end = new Date(this.tempException.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = this.formatDateToISO(d);
        
        // Verificar si ya existe una excepción para esta fecha
        if (this.exceptions.find(ex => ex.date === dateKey)) {
          this.toast.error(`Ya existe una excepción para el día ${dateKey}`);
          return;
        }

        exceptionsToAdd.push({
          date: dateKey,
          closed: true,
          intervals: [],
          exceptionType: 'range',
          startDate: this.tempException.startDate,
          endDate: this.tempException.endDate
        });
      }

      this.exceptions.push(...exceptionsToAdd);
      this.exceptions.sort((a, b) => a.date.localeCompare(b.date));

      try {
        await this.infoManager.saveExceptions(this.exceptions);
        this.cancelException();
        this.toast.success(`Se cerraron ${exceptionsToAdd.length} días correctamente`);
      } catch (error) {
        // Revertir en caso de error
        exceptionsToAdd.forEach(ex => {
          this.exceptions = this.exceptions.filter(e => e.date !== ex.date);
        });
        this.toast.error('Error al guardar las excepciones');
      }
      return;
    }

    // Validaciones para otros tipos (closed, custom)
    if (!this.tempException?.date) {
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

  private formatDateToISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const groupedExceptions = this.getGroupedExceptions();
    const exceptionToEdit = groupedExceptions[index];
    
    if (!exceptionToEdit) return;

    // Si es un rango, no permitir edición por ahora (sería complejo)
    if (exceptionToEdit.exceptionType === 'range') {
      this.toast.error('Para modificar un rango, elimínalo y crea uno nuevo');
      return;
    }

    // Guardar la excepción original para poder restaurarla si se cancela
    const originalException = { ...exceptionToEdit };

    this.tempException = {
      ...originalException
    };

    // Remover temporalmente de la lista
    const indexInOriginal = this.exceptions.findIndex(ex => ex.date === exceptionToEdit.date);
    if (indexInOriginal !== -1) {
      this.exceptions.splice(indexInOriginal, 1);
    }
    this.currentExceptionStep = 'hours';
  }

  async removeException(index: number) {
    const groupedExceptions = this.getGroupedExceptions();
    const exceptionToRemove = groupedExceptions[index];
    
    if (!exceptionToRemove) return;

    // Determinar mensaje de confirmación según el tipo
    let confirmMessage = '¿Seguro que desea eliminar esta excepción?';
    if (exceptionToRemove.exceptionType === 'range' && exceptionToRemove.startDate && exceptionToRemove.endDate) {
      const start = new Date(exceptionToRemove.startDate);
      const end = new Date(exceptionToRemove.endDate);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      confirmMessage = `¿Seguro que desea eliminar este rango de ${days} días?`;
    }

    if (!await this.toast.confirm(confirmMessage)) return;

    const backup = [...this.exceptions];

    // Si es un rango, eliminar todos los días del rango
    if (exceptionToRemove.exceptionType === 'range' && exceptionToRemove.startDate && exceptionToRemove.endDate) {
      this.exceptions = this.exceptions.filter(ex => {
        // Mantener excepciones que NO son parte de este rango
        return !(ex.exceptionType === 'range' && 
                 ex.startDate === exceptionToRemove.startDate && 
                 ex.endDate === exceptionToRemove.endDate);
      });
    } else {
      // Eliminar excepción individual
      this.exceptions = this.exceptions.filter(ex => ex.date !== exceptionToRemove.date);
    }

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

  nextStepFromDate() {
    if (this.validateExceptionDate()) {
      this.currentExceptionStep = 'hours';
    }
  }

  prevStep() {
    if (this.currentExceptionStep === 'type') {
      // No hay paso anterior desde tipo (es el primero)
      return;
    } else if (this.currentExceptionStep === 'date') {
      this.currentExceptionStep = 'type';
    } else if (this.currentExceptionStep === 'hours') {
      // Volver al paso anterior según el tipo
      if (this.tempException?.exceptionType === 'range') {
        this.currentExceptionStep = 'type';
      } else {
        this.currentExceptionStep = 'date';
      }
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
  async onBarberFileSelected(event: Event): Promise<void> {
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

      // Procesar a WebP (manteniendo proporción, limitar tamaño)
      try {
        const { blob } = await this.imageProcessor.processGeneric(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.84 });
        this.selectedBarberFile = file;
        this.processedBarberBlob = blob;
        if (this.barberImagePreviewUrl) {
          URL.revokeObjectURL(this.barberImagePreviewUrl);
        }
        this.barberImagePreviewUrl = URL.createObjectURL(blob);
      } catch (e) {
        this.toast.error('No se pudo procesar la imagen.');
      }
    }
  }
  private async uploadBarberImageIfSelected(): Promise<string | null> {
    if (!this.selectedBarberFile) {
      return null;
    }

    return new Promise((resolve, reject) => {
  const task = this.galleryService.uploadBarberImage(this.processedBarberBlob || this.selectedBarberFile!, this.selectedBarberFile!.name);
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
    this.processedBarberBlob = null;

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

