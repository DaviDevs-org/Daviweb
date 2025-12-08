import { Component, inject, signal, computed, ViewChild, ElementRef, OnDestroy, DestroyRef } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { BusinessStateService } from "@presentation/shared/business-state.service";
import {
  ScheduleDay,
  ContactInfo,
  ExceptionItem,
  Barber,
  BarberSettings,
  Interval,
  PhotoType,
  GalleryPhoto
} from "@domain/index";
import {
  UpdateScheduleUseCase,
  UpdateContactInfoUseCase,
  AddExceptionUseCase,
  DeleteExceptionUseCase,
  UpdateExceptionUseCase,
  UpdateBarberSettingsUseCase,
  AddBarberUseCase,
  RemoveBarberUseCase,
  EditBarberUseCase
} from "@application/business";
import { UploadPhotoUseCase } from "@application/gallery";
import { AlertService } from "@presentation/shared/alert/alert.service";
import { percentage } from "@angular/fire/storage";
import { Subscription } from "rxjs";

@Component({
  selector: "app-info-management",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./info-management.component.html",
  styleUrls: ["./info-management.component.scss"]
})
export class InfoManagementComponent implements OnDestroy {
  private businessState = inject(BusinessStateService);

  // Signals for state
  schedule = this.businessState.rawSchedule;
  contactInfo = this.businessState.contactInfo;
  exceptions = this.businessState.exceptions;
  barberSettings = this.businessState.barberSettings;
  
  // UI State signals
  isBarberUploading = signal(false);
  barberUploadProgress = signal("0%");
  
  // Exception Wizard State
  currentExceptionStep = signal<"date" | "type" | "hours" | "complete">("complete");
  tempException = signal<Partial<ExceptionItem> | null>(null);
  
  exceptionTypes = [
    { value: "closed", label: "Cerrar todo el día", icon: "bi bi-x-circle" },
    { value: "custom", label: "Horario especial", icon: "bi bi-clock" },
    { value: "range", label: "Cerrar varios días", icon: "bi bi-calendar-range" }
  ];

  // Barber Image Upload
  @ViewChild("barberFileInput") barberFileInput!: ElementRef<HTMLInputElement>;
  selectedBarberFile: File | null = null;
  barberImagePreviewUrl = signal<string>("");
  private barberUploadSubscription: Subscription | undefined;

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
  private destroyRef = inject(DestroyRef);

  // ngOnInit removed as data is loaded via BusinessStateService

  // ===== SCHEDULE =====
  
  getScheduleRowClass(day: ScheduleDay): string {
    return day.closed ? "schedule-row closed-day" : "schedule-row";
  }

  addInterval(day: ScheduleDay) {
    if (day.closed) return;
    const currentSchedule = this.schedule();
    day.intervals.push({ open: "09:00", close: "14:00" } as Interval);
    this.schedule.set([...currentSchedule]);
  }

  removeInterval(day: ScheduleDay, i: number) {
    const currentSchedule = this.schedule();
    day.intervals.splice(i, 1);
    this.schedule.set([...currentSchedule]);
  }

  validateInterval(day: ScheduleDay, interval: Interval) {
    if (!day.closed && interval.open && interval.close && interval.open >= interval.close) {
      interval.close = "";
      this.schedule.set([...this.schedule()]);
    }
  }

  onToggleDayClosed(day: ScheduleDay) {
    const currentSchedule = this.schedule();
    if (day.closed) {
      (day as any).backupIntervals = [...day.intervals];
      day.intervals = [];
    } else {
      if ((day as any).backupIntervals?.length) {
        day.intervals = [...(day as any).backupIntervals];
      } else if (!day.intervals.length) {
        day.intervals.push({ open: "09:00", close: "14:00" } as Interval);
      }
      delete (day as any).backupIntervals;
    }
    this.schedule.set([...currentSchedule]);
  }

  async saveSchedule() {
    try {
      await this.updateScheduleUC.execute(this.schedule());
      this.toast.success("Horario semanal guardado correctamente!");
    } catch (err) {
      console.error(err);
      this.toast.error("Error al guardar el horario semanal");
    }
  }

  // ===== EXCEPTIONS =====

  groupedExceptions = computed(() => {
    const exList = this.exceptions();
    const grouped: ExceptionItem[] = [];
    const processedRanges = new Set<string>();

    for (const ex of exList) {
      if (ex.exceptionType === "range" && ex.startDate && ex.endDate) {
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
      date: "",
      closed: false,
      intervals: [{ open: "09:00", close: "14:00" } as Interval],
      exceptionType: undefined,
      startDate: undefined,
      endDate: undefined
    });
    this.currentExceptionStep.set("type");
  }

  selectExceptionType(type: string) {
    const temp = this.tempException();
    if (!temp) return;

    const validType = type as "closed" | "custom" | "range";
    temp.exceptionType = validType;
    temp.closed = validType === "closed" || validType === "range";

    if (validType === "closed" || validType === "custom") {
      this.currentExceptionStep.set("date");
      if (validType === "closed") {
        temp.intervals = [];
      } else {
        if (!temp.intervals?.length) {
          temp.intervals = [{ open: "09:00", close: "14:00" } as Interval];
        }
      }
    } else if (validType === "range") {
      temp.intervals = [];
      this.currentExceptionStep.set("hours");
    }
    this.tempException.set({ ...temp });
  }

  validateExceptionDate(): boolean {
    const temp = this.tempException();
    if (!temp?.date) {
      this.toast.error("Por favor, selecciona una fecha");
      return false;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(temp.date)) {
      this.toast.error("Formato de fecha inválido. Use YYYY-MM-DD.");
      return false;
    }
    const existing = this.exceptions().find(ex => ex.date === temp.date);
    if (existing) {
      this.toast.error("Ya existe una excepción para esta fecha");
      return false;
    }
    return true;
  }

  nextStep() {
    if (this.currentExceptionStep() === "date" && this.validateExceptionDate()) {
      this.currentExceptionStep.set("type");
    }
  }

  nextStepFromDate() {
    if (this.validateExceptionDate()) {
      this.currentExceptionStep.set("hours");
    }
  }

  prevStep() {
    const step = this.currentExceptionStep();
    if (step === "type") return;
    if (step === "date") this.currentExceptionStep.set("type");
    if (step === "hours") {
      if (this.tempException()?.exceptionType === "range") {
        this.currentExceptionStep.set("type");
      } else {
        this.currentExceptionStep.set("date");
      }
    }
  }

  cancelException() {
    this.tempException.set(null);
    this.currentExceptionStep.set("complete");
  }

  addExInterval() {
    const temp = this.tempException();
    if (!temp?.intervals) return;
    temp.intervals.push({ open: "09:00", close: "14:00" } as Interval);
    this.tempException.set({ ...temp });
  }

  removeExInterval(index: number) {
    const temp = this.tempException();
    if (!temp?.intervals || temp.intervals.length <= 1) {
      this.toast.error("Debe haber al menos un intervalo de horario");
      return;
    }
    temp.intervals.splice(index, 1);
    this.tempException.set({ ...temp });
  }

  validateExInterval(interval: Interval, index: number) {
    if (interval.open && interval.close && interval.open >= interval.close) {
      this.toast.error("La hora de cierre debe ser posterior a la de apertura");
      interval.close = "";
      return false;
    }
    return true;
  }

  async finishException() {
    const temp = this.tempException();
    if (!temp?.exceptionType) {
      this.toast.error("Completa todos los campos obligatorios");
      return;
    }

    try {
      if (temp.exceptionType === "range") {
        if (!temp.startDate || !temp.endDate) {
          this.toast.error("Debes seleccionar una fecha de inicio y fin");
          return;
        }
        if (temp.startDate > temp.endDate) {
          this.toast.error("La fecha de inicio debe ser anterior o igual a la fecha de fin");
          return;
        }

        const start = new Date(temp.startDate);
        const end = new Date(temp.endDate);
        const promises = [];

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateKey = d.toISOString().split("T")[0];
          if (this.exceptions().find(ex => ex.date === dateKey)) {
             continue; 
          }
          const ex = new ExceptionItem(
            dateKey,
            true,
            [],
            "range",
            undefined,
            false,
            temp.startDate,
            temp.endDate
          );
          promises.push(this.addExceptionUC.execute(ex));
        }
        
        await Promise.all(promises);
        this.toast.success("Rango de excepciones guardado");

      } else {
        if (!temp.date) {
            this.toast.error("Falta la fecha");
            return;
        }
        const ex = new ExceptionItem(
            temp.date,
            !!temp.closed,
            temp.intervals as Interval[] || [],
            temp.exceptionType,
            undefined,
            false
        );
        await this.addExceptionUC.execute(ex);
        this.toast.success("Excepción guardada");
      }

      // No need to manually refresh exceptions, the subscription will handle it
      this.cancelException();

    } catch (error) {
      console.error(error);
      this.toast.error("Error al guardar excepción");
    }
  }

  async removeException(index: number) {
    const grouped = this.groupedExceptions();
    const toRemove = grouped[index];
    if (!toRemove) return;

    if (!await this.toast.confirm("¿Seguro que desea eliminar esta excepción?")) return;

    try {
      if (toRemove.exceptionType === "range" && toRemove.startDate && toRemove.endDate) {
        const allEx = this.exceptions();
        const inRange = allEx.filter(ex => 
            ex.exceptionType === "range" && 
            ex.startDate === toRemove.startDate && 
            ex.endDate === toRemove.endDate
        );
        await Promise.all(inRange.map(ex => this.deleteExceptionUC.execute(ex.date)));
      } else {
        await this.deleteExceptionUC.execute(toRemove.date);
      }
      
      // No need to manually refresh exceptions
      this.toast.success("Excepción eliminada");
    } catch (e) {
      this.toast.error("Error al eliminar");
    }
  }

  async editException(index: number) {
      const grouped = this.groupedExceptions();
      const toEdit = grouped[index];
      if(!toEdit) return;
      
      if(toEdit.exceptionType === "range") {
          this.toast.error("Elimina y crea de nuevo para rangos");
          return;
      }
      
      this.tempException.set({...toEdit});
      this.currentExceptionStep.set("hours");
  }

  // ===== CONTACT INFO =====

  async saveContactInfo() {
    const info = this.contactInfo();
    if (!info) return;
    try {
      await this.updateContactInfoUC.execute(info);
      this.toast.success("Información de contacto guardada");
    } catch (err) {
      this.toast.error("Error al guardar contacto");
    }
  }

  // ===== BARBERS =====

  async toggleBarberSelection() {
    const settings = this.barberSettings();
    if (!settings) return;
    
    // Optimistic update
    settings.barberSelection = !settings.barberSelection;
    this.barberSettings.set(settings);
    
    try {
      await this.updateBarberSettingsUC.execute(settings);
    } catch (err) {
      // Revert on error
      settings.barberSelection = !settings.barberSelection;
      this.barberSettings.set(settings);
      this.toast.error("Error al actualizar configuración");
    }
  }

  async saveBarberSettings() {
    const settings = this.barberSettings();
    if (!settings) return;
    try {
      await this.updateBarberSettingsUC.execute(settings);
      this.toast.success("Configuración de peluqueros guardada");
    } catch (err) {
      this.toast.error("Error al guardar");
    }
  }

  async addBarber(name: string) {
    const n = name?.trim();
    if (!n) return;
    if (!this.selectedBarberFile) {
      this.toast.error("Selecciona una imagen");
      return;
    }

    try {
      const imageUrl = await this.uploadBarberImage();
      const newBarber = new Barber(n, imageUrl || undefined);
      
      await this.addBarberUC.execute(newBarber);
      
      // No need to manually refresh, subscription handles it
      
      this.toast.success("Peluquero añadido");
      this.clearBarberFileSelection();
    } catch (err) {
      console.error(err);
      this.toast.error("Error al añadir peluquero");
    }
  }

  async removeBarber(barber: Barber) {
    if (!await this.toast.confirm(`¿Eliminar a ${barber.name}?`)) return;
    try {
      await this.removeBarberUC.execute(barber);
      // No need to manually refresh
    } catch (err) {
      this.toast.error("Error al eliminar");
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

  private async uploadBarberImage(): Promise<string | null> {
    if (!this.selectedBarberFile) return null;
    
    return new Promise((resolve, reject) => {
      const photo = new GalleryPhoto(
        this.selectedBarberFile!.name,
        crypto.randomUUID(),
        undefined,
        false,
        PhotoType.BARBER
      );

      this.uploadPhotoUC.execute(this.selectedBarberFile!, photo).then(({ task }) => {
        this.isBarberUploading.set(true);
        
        this.barberUploadSubscription = percentage(task).subscribe(({ progress }) => {
          this.barberUploadProgress.set(`${progress}%`);
        });

        task.then(async (snapshot) => {
             const { getDownloadURL } = await import("@angular/fire/storage");
             const url = await getDownloadURL(snapshot.ref);
             
             this.isBarberUploading.set(false);
             this.barberUploadProgress.set("0%");
             resolve(url);
        }).catch(err => {
            this.isBarberUploading.set(false);
            reject(err);
        });
      });
    });
  }

  private clearBarberFileSelection() {
    this.selectedBarberFile = null;
    URL.revokeObjectURL(this.barberImagePreviewUrl());
    this.barberImagePreviewUrl.set("");
    if (this.barberFileInput) this.barberFileInput.nativeElement.value = "";
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
