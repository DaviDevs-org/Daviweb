import {
  Component,
  ElementRef,
  inject,
  signal,
  ViewChild,
  OnDestroy,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { percentage, getDownloadURL } from '@angular/fire/storage';
import { Subscription } from 'rxjs';
import {
  CreateServiceUseCase,
  UpdateServiceUseCase,
  DeleteServiceUseCase,
} from '@application/services';
import { DeletePhotoUseCase, UploadPhotoUseCase } from '@application/gallery';
import { Service } from '@domain/services';
import { GalleryPhoto, PhotoType } from '@domain/gallery';
import { AlertService } from '@presentation/shared/alert/alert.service';
import { BusinessStateService } from '@presentation/shared/business-state.service';
import { getErrorMessage } from '@domain/shared/utils/error.utils';
import { TenantService } from 'src/app/config/tenant.service';

@Component({
  selector: 'app-services-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services-management.component.html',
  styleUrls: ['./services-management.component.scss'],
})
export class ServicesManagementComponent implements OnDestroy {
  // ==========================================================================
  // View Children
  // ==========================================================================
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('formTop') formTop!: ElementRef<HTMLDivElement>;

  // ==========================================================================
  // Dependency Injection
  // ==========================================================================
  private injector = inject(Injector);
  private businessState = inject(BusinessStateService);
  private tenantService = inject(TenantService);
  private createServiceUseCase = inject(CreateServiceUseCase);
  private updateServiceUseCase = inject(UpdateServiceUseCase);
  private deleteServiceUseCase = inject(DeleteServiceUseCase);
  private uploadPhotoUseCase = inject(UploadPhotoUseCase);
  private deletePhotoUseCase = inject(DeletePhotoUseCase);
  private toast = inject(AlertService);

  // ==========================================================================
  // State Signals & Properties
  // ==========================================================================
  services = this.businessState.services;
  tenantConfig = this.tenantService.getTenantConfig().features;
  uploadProgress = signal('0%');
  isUploading = signal(false);
  hasBreaks = signal(false);
  useHourRange = signal(false);
  isEditing = signal(false);
  expandedServiceIndexes = signal<Set<number>>(new Set());

  newService: Service = Service.createEmpty();
  selectedFile: File | null = null;
  imagePreviewUrl: string = '';
  lengths: ('short' | 'medium' | 'long')[] = ['short', 'medium', 'long'];

  lengthMap: Record<'short' | 'medium' | 'long', string> = {
    short: 'Corto',
    medium: 'Medio',
    long: 'Largo',
  };

  // ==========================================================================
  // Internal State & Subscriptions
  // ==========================================================================
  private scrollSub: Subscription | null = null;
  private uploadSubscription: Subscription | undefined = undefined;
  private editServiceId: string | null = null;
  private existingImageUrl: string | undefined;

  // ==========================================================================
  // ==========================================================================
  // Lifecycle Hooks
  // ==========================================================================
  // ngOnInit removed as services are loaded via BusinessStateService

  ngOnDestroy() {
    if (this.scrollSub) this.scrollSub.unsubscribe();
    if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl);
    this.uploadSubscription?.unsubscribe();
  }

  // ==========================================================================
  // Form & File Handling Methods
  // ==========================================================================
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;

    this.selectedFile = target.files[0];
    if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl);
    this.imagePreviewUrl = URL.createObjectURL(this.selectedFile);
  }

  async onSubmit() {
    const priceError = this.validatePrices();
    if (priceError) {
      this.toast.error(priceError);
      return;
    }
    if (this.isEditing()) {
      await this.updateServiceFromForm();
    } else {
      await this.addService();
    }
  }

  private validatePrices(): string | null {
    if (!this.tenantConfig.enablePrices) return null;
    if (this.newService.requiresHairLength) {
      for (const l of this.lengths) {
        if (this.newService.hairLengthModifiers[l].price == null) {
          return `Indica el precio para la longitud "${this.lengthMap[l]}".`;
        }
      }
    } else {
      if (this.newService.basePrice == null) {
        return 'Indica el precio del servicio.';
      }
    }
    return null;
  }

  cancelEditing() {
    this.resetForm();
  }

  private resetForm() {
    this.newService = Service.createEmpty();
    this.hasBreaks.set(false);
    this.useHourRange.set(false);
    this.isEditing.set(false);
    this.editServiceId = null;
    this.existingImageUrl = undefined;
    this.clearFileSelection();
  }

  private clearFileSelection(): void {
    this.selectedFile = null;

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = '';
    }

    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  // ==========================================================================
  // Service CRUD Operations
  // ==========================================================================
  async addService(): Promise<void> {
    if (!this.selectedFile) {
      this.toast.error('Por favor, escoja una imagen.');
      return;
    }

    const error = this.newService.validate();
    if (error) {
      this.toast.error(error);
      return;
    }

    try {
      this.newService.imageUrl =
        (await this.uploadImageIfSelected()) ?? undefined;
      await this.createServiceUseCase.execute(this.newService);
      this.resetForm();
      this.toast.success('Servicio añadido correctamente!');
    } catch (error) {
      console.error('Error al añadir servicio:', error);
      this.toast.error(getErrorMessage(error));
    }
    return;
  }

  async editService(index: number) {
    const serviceU = this.services()[index];
    this.populateFormFromService(serviceU);
  }

  private async updateServiceFromForm(): Promise<void> {
    if (!this.editServiceId) {
      this.toast.error('No se ha podido identificar el servicio a actualizar.');
      return;
    }

    const error = this.newService.validate();
    if (error) {
      this.toast.error(error);
      return;
    }

    try {
      const oldImageUrl = this.existingImageUrl;
      this.newService.imageUrl =
        (this.selectedFile
          ? await this.uploadImageIfSelected()
          : oldImageUrl) ?? undefined;

      // Si se subió imagen nueva y había una anterior, borrar la antigua de Storage
      if (this.selectedFile && oldImageUrl) {
        const oldId = this.extractStorageIdFromUrl(oldImageUrl);
        if (oldId) {
          try {
            await this.deletePhotoUseCase.execute(
              new GalleryPhoto(oldId, oldId, oldImageUrl, true, PhotoType.SERVICE)
            );
          } catch (e) {
            // No bloqueamos la actualización si el borrado falla
            console.warn('No se pudo borrar la imagen anterior de Storage:', e);
          }
        }
      }

      await this.updateServiceUseCase.execute(
        this.editServiceId,
        this.newService
      );
      this.resetForm();
      this.toast.success('Servicio actualizado correctamente!');
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      this.toast.error(getErrorMessage(error));
    }
  }

  async deleteService(index: number) {
    const service = this.services()[index];
    if (
      await this.toast.confirm(
        `¿Estás seguro de que quieres eliminar "${service.name}"?`
      )
    ) {
      try {
        await this.deleteServiceUseCase.execute(service.id!);
        this.toast.success(
          `El servicio ${service.name} ha sido borrado con éxito`
        );
      } catch (error) {
        console.error('Error al eliminar servicio:', error);
        this.toast.error(getErrorMessage(error));
      }
    }
  }

  private populateFormFromService(service: Service) {
    this.isEditing.set(true);
    this.editServiceId = service.id ?? null;
    this.existingImageUrl = service.imageUrl;

    this.selectedFile = null;
    if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl);
    this.imagePreviewUrl = service.imageUrl || '';
    if (this.fileInput) this.fileInput.nativeElement.value = '';

    // Create a deep copy using DTO
    this.newService = Service.fromDTO(service.toDTO(), service.id);

    this.hasBreaks.set(
      !this.newService.requiresHairLength &&
        (this.newService.timeSegments?.length || 0) > 1
    );
    this.useHourRange.set(!!service.hourRange);

    this.scrollToForm();
  }

  // ==========================================================================
  // UI Interaction & Toggles
  // ==========================================================================
  toggleBreaks() {
    if (this.hasBreaks() && this.newService.timeSegments.length === 0) {
      this.newService.timeSegments.push({ duration: 30, breakAfter: 0 });
    }
    if (!this.hasBreaks() && this.newService.timeSegments.length > 1) {
      const total = this.newService.timeSegments.reduce(
        (acc, curr) => acc + curr.duration + (curr.breakAfter || 0),
        0
      );
      this.newService.timeSegments = [{ duration: total, breakAfter: 0 }];
    }
  }

  onRequireHairLengthChanged() {
    if (this.newService.requiresHairLength) {
      this.hasBreaks.set(false);
      if (!this.newService.hairLengthModifiers) {
        this.newService.hairLengthModifiers =
          Service.defaultHairLengthModifiers();
      }
    } else {
      if (this.newService.timeSegments.length === 0) {
        this.newService.timeSegments = [{ duration: 30, breakAfter: 0 }];
      }
    }
  }

  onHourRangeToggle() {
    if (this.useHourRange() && !this.newService.hourRange) {
      this.newService.hourRange = { start: '09:00', end: '20:00' };
    } else if (!this.useHourRange()) {
      this.newService.hourRange = undefined;
    }
  }

  toggleDetails(index: number): void {
    this.expandedServiceIndexes.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(index)) newSet.delete(index);
      else newSet.add(index);
      return newSet;
    });
  }

  isDetailsExpanded(index: number): boolean {
    return this.expandedServiceIndexes().has(index);
  }

  private scrollToForm() {
    try {
      setTimeout(() => {
        const el = this.formTop?.nativeElement;
        if (el) {
          el.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
          });
        }
      }, 100);
    } catch {}
  }

  // ==========================================================================
  // Time & Segment Management
  // ==========================================================================
  addTimeSegment() {
    if (!this.hasBreaks() && !this.newService.requiresHairLength) {
      if (this.newService.timeSegments.length === 0) {
        this.newService.timeSegments.push({ duration: 30, breakAfter: 0 });
      } else {
        this.newService.timeSegments[0].duration += 15;
      }
    } else {
      this.newService.timeSegments.push({ duration: 30, breakAfter: 0 });
    }
  }

  removeTimeSegment(index: number) {
    if (!this.hasBreaks() && !this.newService.requiresHairLength) {
      if (
        this.newService.timeSegments.length > 0 &&
        this.newService.timeSegments[0].duration > 15
      ) {
        this.newService.timeSegments[0].duration -= 15;
      }
    } else {
      if (this.newService.timeSegments.length > 1) {
        this.newService.timeSegments.splice(index, 1);
      }
    }
  }

  addHairLengthSegment(length: 'short' | 'medium' | 'long') {
    if (!this.newService.hairLengthModifiers) return;
    if (!this.newService.hairLengthModifiers[length].segments) {
      this.newService.hairLengthModifiers[length].segments = [];
    }
    this.newService.hairLengthModifiers[length].segments!.push({
      duration: 30,
      breakAfter: 0,
    });
  }

  removeHairLengthSegment(length: 'short' | 'medium' | 'long', index: number) {
    if (!this.newService.hairLengthModifiers) return;
    const segs = this.newService.hairLengthModifiers[length].segments;
    if (segs && segs.length > 0) {
      segs.splice(index, 1);
    }
  }

  // ==========================================================================
  // Helpers / Utilities
  // ==========================================================================
  // Extrae el nombre del fichero (id) desde una URL de Firebase Storage
  private extractStorageIdFromUrl(url: string): string | null {
    try {
      // URL formato: .../o/PATH_ENCODED?alt=media...
      const match = url.match(/\/o\/([^?]+)/);
      if (!match) return null;
      const fullPath = decodeURIComponent(match[1]);
      return fullPath.split('/').pop() ?? null;
    } catch {
      return null;
    }
  }

  private async uploadImageIfSelected(): Promise<string | null> {
    if (!this.selectedFile) return null;

    const sanitizedName = this.selectedFile.name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${sanitizedName}`;

    const photo = new GalleryPhoto(
      this.selectedFile.name,
      uniqueId,
      undefined,
      false,
      PhotoType.SERVICE
    );
    const { task } = await this.uploadPhotoUseCase.execute(
      this.selectedFile,
      photo
    );

    this.uploadSubscription?.unsubscribe();
    this.isUploading.set(true);

    this.uploadSubscription = runInInjectionContext(this.injector, () =>
      percentage(task).subscribe(({ progress }) => {
        this.uploadProgress.set(`${progress}%`);
      })
    );

    try {
      const snapshot = await task;
      const url = await runInInjectionContext(this.injector, () =>
        getDownloadURL(snapshot.ref)
      );
      return url;
    } catch (error) {
      console.error('Error al subir:', error);
      throw error;
    } finally {
      this.isUploading.set(false);
      this.uploadProgress.set('0%');
      this.clearFileSelection();
    }
  }
}
