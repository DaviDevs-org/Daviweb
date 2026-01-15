import {
  Component,
  inject,
  signal,
  computed,
  ViewChild,
  ElementRef,
  OnDestroy,
  linkedSignal,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BusinessStateService } from '@presentation/shared/business-state.service';
import {
  ScheduleDay,
  ScheduleDayDTO,
  ContactInfo,
  ExceptionItem,
  ExceptionItemDTO,
  Barber,
  BarberDTO,
  BarberSettings,
  Interval,
  IntervalDTO,
  PhotoType,
  GalleryPhoto,
} from '@domain/index';
import {
  UpdateScheduleUseCase,
  UpdateContactInfoUseCase,
  AddExceptionUseCase,
  DeleteExceptionUseCase,
  UpdateExceptionUseCase,
  UpdateBarberSettingsUseCase,
  AddBarberUseCase,
  RemoveBarberUseCase,
  EditBarberUseCase,
} from '@application/business';
import { UploadPhotoUseCase } from '@application/gallery';
import { AlertService } from '@presentation/shared/alert/alert.service';
import { percentage, getDownloadURL } from '@angular/fire/storage';
import { Subscription } from 'rxjs';
import { getErrorMessage } from '@domain/shared/utils/error.utils';

import { ScheduleEditorComponent } from '../shared/schedule-editor/schedule-editor.component';
import { BarberEditModalComponent } from '../barbers-management/barber-edit-modal/barber-edit-modal.component';

@Component({
  selector: 'app-info-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ScheduleEditorComponent, BarberEditModalComponent],
  templateUrl: './info-management.component.html',
  styleUrls: ['./info-management.component.scss'],
})
export class InfoManagementComponent implements OnDestroy {
  private businessState = inject(BusinessStateService);
  private injector = inject(Injector);

  // Signals for local form state
  schedule = linkedSignal(() =>
    this.businessState.rawSchedule().map((day) => day.toDTO())
  );

  contactInfo = linkedSignal(() => {
    const info = this.businessState.contactInfo();
    // Filter out loading state
    if (info.email.getValue() === 'loading@loading.com') return null;
    return info.toDTO();
  });

  exceptions = linkedSignal(() =>
    this.businessState.exceptions().map((ex) => ex.toDTO())
  );

  barberSettings = linkedSignal(
    () => this.businessState.barberSettings()?.toDTO() ?? null
  );

  // UI State signals
  isBarberUploading = signal(false);
  barberUploadProgress = signal('0%');

  // Computed signals for loading state
  isLoading = computed(() => {
    const contact = this.contactInfo();
    const schedule = this.schedule();
    return !contact || !schedule || schedule.length === 0;
  });

  isBarberLoading = computed(() => {
    return this.barberSettings() === null;
  });

  // Exception Wizard State
  currentExceptionStep = signal<'date' | 'type' | 'hours' | 'complete'>(
    'complete'
  );
  tempException = signal<Partial<ExceptionItemDTO> | null>(null);

  exceptionTypes = [
    { value: 'closed', label: 'Cerrar todo el día', icon: 'bi bi-x-circle' },
    { value: 'custom', label: 'Horario especial', icon: 'bi bi-clock' },
    {
      value: 'range',
      label: 'Cerrar varios días',
      icon: 'bi bi-calendar-range',
    },
  ];

  // Barber Image Upload
  @ViewChild('barberFileInput') barberFileInput!: ElementRef<HTMLInputElement>;
  selectedBarberFile: File | null = null;
  barberImagePreviewUrl = signal<string>('');
  private barberUploadSubscription: Subscription | undefined;

  // Barber Modal State
  editingBarber = signal<BarberDTO | null>(null);

  // Injected Use Cases
  private updateScheduleUC = inject(UpdateScheduleUseCase);
  private updateContactInfoUC = inject(UpdateContactInfoUseCase);
  private addExceptionUC = inject(AddExceptionUseCase);
  private deleteExceptionUC = inject(DeleteExceptionUseCase);
  private updateExceptionUC = inject(UpdateExceptionUseCase);
  private updateBarberSettingsUC = inject(UpdateBarberSettingsUseCase);
  private addBarberUC = inject(AddBarberUseCase);
  private removeBarberUC = inject(RemoveBarberUseCase);
  private editBarberUC = inject(EditBarberUseCase);
  private uploadPhotoUC = inject(UploadPhotoUseCase);

  private toast = inject(AlertService);

  // ===== SCHEDULE =====

  async saveSchedule(scheduleDTOs: ScheduleDayDTO[]) {
    try {
      // Update local state just in case
      this.schedule.set(scheduleDTOs);
      
      const scheduleEntities = scheduleDTOs.map((dto) =>
        ScheduleDay.fromDTO(dto)
      );
      await this.updateScheduleUC.execute(scheduleEntities);
      this.toast.success('Horario semanal guardado correctamente!');
    } catch (err) {
      console.error(err);
      this.toast.error(getErrorMessage(err));
    }
  }

  // ===== EXCEPTIONS =====

  groupedExceptions = computed(() => {
    const exList = this.exceptions();
    const grouped: ExceptionItemDTO[] = [];
    const processedRanges = new Set<string>();

    for (const ex of exList) {
      if (ex.exceptionType === 'range' && ex.startDate && ex.endDate) {
        const rangeKey = `${ex.startDate}-${ex.endDate}`;
        if (processedRanges.has(rangeKey)) continue;
        processedRanges.add(rangeKey);
        grouped.push(ex);
      } else {
        grouped.push(ex);
      }
    }
    return grouped;
  });

  startNewException() {
    this.tempException.set({
      date: '',
      closed: false,
      intervals: [{ open: '09:00', close: '14:00' }],
      exceptionType: undefined,
      startDate: undefined,
      endDate: undefined,
    });
    this.currentExceptionStep.set('type');
  }

  selectExceptionType(type: string) {
    const temp = this.tempException();
    if (!temp) return;

    const validType = type as 'closed' | 'custom' | 'range';
    temp.exceptionType = validType;
    temp.closed = validType === 'closed' || validType === 'range';

    if (validType === 'closed' || validType === 'custom') {
      this.currentExceptionStep.set('date');
      if (validType === 'closed') {
        temp.intervals = [];
      } else {
        if (!temp.intervals?.length) {
          temp.intervals = [{ open: '09:00', close: '14:00' }];
        }
      }
    } else if (validType === 'range') {
      temp.intervals = [];
      this.currentExceptionStep.set('hours');
    }
    this.tempException.set({ ...temp });
  }

  validateExceptionDate(): boolean {
    const temp = this.tempException();
    if (!temp?.date) {
      this.toast.error('Por favor, selecciona una fecha');
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(temp.date)) {
      this.toast.error('Formato de fecha inválido. Use YYYY-MM-DD.');
      return false;
    }
    const existing = this.exceptions().find((ex) => ex.date === temp.date);
    if (existing) {
      this.toast.error('Ya existe una excepción para esta fecha');
      return false;
    }
    return true;
  }

  nextStep() {
    if (
      this.currentExceptionStep() === 'date' &&
      this.validateExceptionDate()
    ) {
      this.currentExceptionStep.set('type');
    }
  }

  nextStepFromDate() {
    if (this.validateExceptionDate()) {
      this.currentExceptionStep.set('hours');
    }
  }

  prevStep() {
    const step = this.currentExceptionStep();
    if (step === 'type') return;
    if (step === 'date') this.currentExceptionStep.set('type');
    if (step === 'hours') {
      if (this.tempException()?.exceptionType === 'range') {
        this.currentExceptionStep.set('type');
      } else {
        this.currentExceptionStep.set('date');
      }
    }
  }

  cancelException() {
    this.tempException.set(null);
    this.currentExceptionStep.set('complete');
  }

  addExInterval() {
    const temp = this.tempException();
    if (!temp?.intervals) return;
    temp.intervals.push({ open: '09:00', close: '14:00' });
    this.tempException.set({ ...temp });
  }

  removeExInterval(index: number) {
    const temp = this.tempException();
    if (!temp?.intervals || temp.intervals.length <= 1) {
      this.toast.error('Debe haber al menos un intervalo de horario');
      return;
    }
    temp.intervals.splice(index, 1);
    this.tempException.set({ ...temp });
  }

  validateExInterval(interval: IntervalDTO, index: number) {
    if (interval.open && interval.close && interval.open >= interval.close) {
      this.toast.error('La hora de cierre debe ser posterior a la de apertura');
      interval.close = '';
      return false;
    }
    return true;
  }

  async finishException() {
    const temp = this.tempException();
    if (!temp?.exceptionType) {
      this.toast.error('Completa todos los campos obligatorios');
      return;
    }

    try {
      if (temp.exceptionType === 'range') {
        if (!temp.startDate || !temp.endDate) {
          this.toast.error('Debes seleccionar una fecha de inicio y fin');
          return;
        }
        if (temp.startDate > temp.endDate) {
          this.toast.error(
            'La fecha de inicio debe ser anterior o igual a la fecha de fin'
          );
          return;
        }

        const start = new Date(temp.startDate);
        const end = new Date(temp.endDate);
        const promises = [];

        // If editing a range, we should probably delete old range first?
        // But range editing is disabled in editException currently ("Elimina y crea de nuevo para rangos")
        // So we assume this is always a new range or a replacement.

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split('T')[0];
          // Check if exists in local state (which reflects global)
          if (this.exceptions().find((ex) => ex.date === dateKey)) {
            continue;
          }
          const ex = new ExceptionItem(
            dateKey,
            true,
            [],
            'range',
            undefined,
            false,
            temp.startDate,
            temp.endDate
          );
          promises.push(this.addExceptionUC.execute(ex));
        }

        await Promise.all(promises);
        this.toast.success('Rango de excepciones guardado');
      } else {
        if (!temp.date) {
          this.toast.error('Falta la fecha');
          return;
        }
        const intervals = (temp.intervals || []).map(
          (i) => new Interval(i.open, i.close)
        );
        const ex = new ExceptionItem(
          temp.date,
          !!temp.closed,
          intervals,
          temp.exceptionType,
          temp.id, // Pass ID if exists
          false
        );

        if (temp.id) {
          // It's an update
          await this.updateExceptionUC.execute(temp.id, ex);
          this.toast.success('Excepción actualizada');
        } else {
          // It's a new one
          // Check if date already exists to avoid duplicates/overwrite without warning?
          // The validateExceptionDate() checks this for new ones.
          await this.addExceptionUC.execute(ex);
          this.toast.success('Excepción guardada');
        }
      } // No need to manually refresh exceptions, the subscription will handle it
      this.cancelException();
    } catch (error) {
      console.error(error);
      this.toast.error(getErrorMessage(error));
    }
  }

  async removeException(index: number) {
    const grouped = this.groupedExceptions();
    const toRemove = grouped[index];
    if (!toRemove) return;

    if (
      !(await this.toast.confirm('¿Seguro que desea eliminar esta excepción?'))
    )
      return;

    try {
      if (
        toRemove.exceptionType === 'range' &&
        toRemove.startDate &&
        toRemove.endDate
      ) {
        const allEx = this.exceptions();
        const inRange = allEx.filter(
          (ex) =>
            ex.exceptionType === 'range' &&
            ex.startDate === toRemove.startDate &&
            ex.endDate === toRemove.endDate
        );
        await Promise.all(
          inRange.map((ex) => this.deleteExceptionUC.execute(ex.id || ex.date))
        );
      } else {
        await this.deleteExceptionUC.execute(toRemove.id || toRemove.date);
      }

      // No need to manually refresh exceptions
      this.toast.success('Excepción eliminada');
    } catch (e) {
      this.toast.error(getErrorMessage(e));
    }
  }

  async editException(index: number) {
    const grouped = this.groupedExceptions();
    const toEdit = grouped[index];
    if (!toEdit) return;

    if (toEdit.exceptionType === 'range') {
      this.toast.error('Elimina y crea de nuevo para rangos');
      return;
    }

    const intervalsDTO = toEdit.intervals.map((i) => ({
      open: i.open,
      close: i.close,
    }));
    this.tempException.set({
      ...toEdit,
      intervals: intervalsDTO,
    });
    this.currentExceptionStep.set('hours');
  } // ===== CONTACT INFO =====

  async saveContactInfo() {
    const infoDTO = this.contactInfo();
    if (!infoDTO) return;
    try {
      // Reconstruct domain object from DTO
      const info = ContactInfo.fromDTO(infoDTO);
      await this.updateContactInfoUC.execute(info);
      this.toast.success('Información de contacto guardada');
    } catch (err) {
      console.error(err);
      this.toast.error(getErrorMessage(err));
    }
  }

  // ===== BARBERS =====

  async toggleBarberSelection() {
    const settings = this.barberSettings();
    if (!settings) return;

    settings.barberSelection = !settings.barberSelection;
    this.barberSettings.set({ ...settings }); // Trigger UI update

    // We don't auto-save on toggle anymore, user must click save
    // Or if we want auto-save, we must reconstruct objects
  }

  async saveBarberSettings() {
    const settings = this.barberSettings();
    if (!settings) return;
    try {
      // Reconstruct Barber objects from plain JSON
      const barbers = settings.barbers.map(
        (b) => new Barber(b.name, b.imageUrl, b.imagePath, b.id)
      );
      const domainSettings = new BarberSettings(
        settings.barberSelection,
        barbers
      );

      await this.updateBarberSettingsUC.execute(domainSettings);
      this.toast.success('Configuración de peluqueros guardada');
    } catch (err) {
      console.error(err);
      this.toast.error(getErrorMessage(err));
    }
  }

  async addBarber(name: string) {
    const n = name?.trim();
    if (!n) return;
    if (!this.selectedBarberFile) {
      this.toast.error('Selecciona una imagen');
      return;
    }

    try {
      const uploadResult = await this.uploadBarberImage();
      if (!uploadResult) {
        this.toast.error('No se pudo subir la imagen');
        return;
      }

      const { url, path } = uploadResult;

      // Local state
      const currentSettings = this.barberSettings();
      if (currentSettings) {
        const newBarberPlain: BarberDTO = {
          name: n,
          imageUrl: url,
          imagePath: path,
        };
        currentSettings.barbers.push(newBarberPlain);
        this.barberSettings.set({ ...currentSettings });
      }

      // Dominio + persistencia
      const newBarber = new Barber(n, url, path);
      await this.addBarberUC.execute(newBarber);

      this.toast.success('Peluquero añadido');
      this.clearBarberFileSelection();
    } catch (err) {
      console.error(err);
      this.toast.error(getErrorMessage(err));
    }
  }

  async removeBarber(barberDTO: BarberDTO) {
    if (!(await this.toast.confirm(`¿Eliminar a ${barberDTO.name}?`))) return;
    try {
      const barber = new Barber(
        barberDTO.name,
        barberDTO.imageUrl,
        barberDTO.imagePath,
        barberDTO.id
      );
      await this.removeBarberUC.execute(barber);
      // No need to manually refresh
    } catch (err) {
      this.toast.error(getErrorMessage(err));
    }
  }

  // Edit Barber Modal
  openBarberModal(barber: BarberDTO) {
    this.editingBarber.set(barber);
  }

  closeBarberModal() {
    this.editingBarber.set(null);
  }

  async saveBarberEdit(updatedDTO: BarberDTO) {
    try {
      // Reconstitute domain entity
      const barberEntity = new Barber(
        updatedDTO.name,
        updatedDTO.imageUrl,
        updatedDTO.imagePath,
        updatedDTO.id,
        updatedDTO.schedule?.map(d => ScheduleDay.fromDTO(d)), // Transform schedule DTOs to entities
        updatedDTO.isAvailable
      );

      await this.editBarberUC.execute(barberEntity);
      this.toast.success('Peluquero actualizado correctamente');
      this.closeBarberModal();
    } catch (e: any) {
      console.error(e);
      this.toast.error('Error al actualizar peluquero');
    }
  }

  onBarberFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files?.length) {
      const file = target.files[0];
      this.selectedBarberFile = file;
      this.barberImagePreviewUrl.set(URL.createObjectURL(file));
    }
  }

  private async uploadBarberImage(): Promise<{
    url: string;
    path: string;
  } | null> {
    if (!this.selectedBarberFile) return null;

    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const photo = new GalleryPhoto(
        this.selectedBarberFile!.name,
        id,
        undefined,
        false,
        PhotoType.BARBER
      );

      this.uploadPhotoUC
        .execute(this.selectedBarberFile!, photo)
        .then(({ task }) => {
          this.isBarberUploading.set(true);

          this.barberUploadSubscription = runInInjectionContext(
            this.injector,
            () =>
              percentage(task).subscribe(({ progress }) => {
                this.barberUploadProgress.set(`${progress}%`);
              })
          );

          task
            .then(async (snapshot) => {
              const url = await runInInjectionContext(this.injector, () =>
                getDownloadURL(snapshot.ref)
              );

              this.isBarberUploading.set(false);
              this.barberUploadProgress.set('0%');

              // snapshot.ref.fullPath = path real en Storage
              resolve({ url, path: snapshot.ref.fullPath });
            })
            .catch((err) => {
              this.isBarberUploading.set(false);
              reject(err);
            });
        });
    });
  }

  private clearBarberFileSelection() {
    this.selectedBarberFile = null;
    URL.revokeObjectURL(this.barberImagePreviewUrl());
    this.barberImagePreviewUrl.set('');
    if (this.barberFileInput) this.barberFileInput.nativeElement.value = '';
  }

  ngOnDestroy() {
    if (this.barberImagePreviewUrl()) {
      URL.revokeObjectURL(this.barberImagePreviewUrl());
    }
    if (this.barberUploadSubscription) {
      this.barberUploadSubscription.unsubscribe();
    }
  }
}
