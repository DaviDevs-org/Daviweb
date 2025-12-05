import { Component, ElementRef, inject, signal, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { percentage, getDownloadURL } from '@angular/fire/storage';
import { Subscription } from 'rxjs';
import { GetServicesUseCase, CreateServiceUseCase, UpdateServiceUseCase, DeleteServiceUseCase } from '@application/services';
import { UploadPhotoUseCase } from '@application/gallery';
import { Service} from '@domain/services';
import { GalleryPhoto, PhotoType } from '@domain/gallery';
import { AlertService } from '@presentation/shared/alert/alert.service';

@Component({
  selector: 'app-services-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services-management.component.html',
  styleUrls: ['./services-management.component.scss']
})
export class ServicesManagementComponent implements OnInit, OnDestroy {

  // ==========================================================================
  // View Children
  // ==========================================================================
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('formTop') formTop!: ElementRef<HTMLDivElement>;

  // ==========================================================================
  // Dependency Injection
  // ==========================================================================
  private auth = inject(Auth);
  private getServicesUseCase = inject(GetServicesUseCase);
  private createServiceUseCase = inject(CreateServiceUseCase);
  private updateServiceUseCase = inject(UpdateServiceUseCase);
  private deleteServiceUseCase = inject(DeleteServiceUseCase);
  private uploadPhotoUseCase = inject(UploadPhotoUseCase);
  private toast = inject(AlertService);

  // ==========================================================================
  // State Signals & Properties
  // ==========================================================================
  services = signal<Service[]>([]);
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
    long: 'Largo'
  };

  // ==========================================================================
  // Internal State & Subscriptions
  // ==========================================================================
  private scrollSub: Subscription | null = null;
  private uploadSubscription: Subscription | undefined = undefined;
  private editServiceId: string | null = null;
  private existingImageUrl: string | undefined;

  // ==========================================================================
  // Lifecycle Hooks
  // ==========================================================================
  ngOnInit() {
    onAuthStateChanged(this.auth, user => {
      if (user) {
        this.getServicesUseCase.execute().subscribe(servicesData => {
          this.services.set(servicesData);
        });
      }
    });
  }

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
    if (this.isEditing()) {
      await this.updateServiceFromForm();
    } else {
      await this.addService();
    }
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
    if (!this.selectedFile) { this.toast.error('Por favor, escoja una imagen.'); return; }
    
    const error = this.newService.validate();
    if (error) { this.toast.error(error); return; }

    try {
      this.newService.imageUrl = await this.uploadImageIfSelected() ?? undefined;
      await this.createServiceUseCase.execute(this.newService);
      this.resetForm();
      this.toast.success('Servicio añadido correctamente!');
    } catch (error) {
      console.error('Error al añadir servicio:', error);
      this.toast.error('Error al añadir el servicio. Por favor, inténtalo de nuevo.');
    }
  }

  async editService(index: number) {
    const serviceU = this.services()[index];
    this.populateFormFromService(serviceU);
  }

  private async updateServiceFromForm(): Promise<void> {
    if (!this.editServiceId) { this.toast.error('No se ha podido identificar el servicio a actualizar.'); return; }
    
    const error = this.newService.validate();
    if (error) { this.toast.error(error); return; }

    try {
      this.newService.imageUrl = (this.selectedFile ? await this.uploadImageIfSelected() : this.existingImageUrl) ?? undefined;
      await this.updateServiceUseCase.execute(this.editServiceId, this.newService);
      this.resetForm();
      this.toast.success('Servicio actualizado correctamente!');
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      this.toast.error('Error al actualizar el servicio. Por favor, inténtalo de nuevo.');
    }
  }

  async deleteService(index: number) {
    const service = this.services()[index];
    if (await this.toast.confirm(`¿Estás seguro de que quieres eliminar "${service.name}"?`)) {
      this.deleteServiceUseCase.execute(service.id!).subscribe({
        next: () => this.toast.success(`El servicio ${service.name} ha sido borrado con éxito`),
        error: (err) => console.error(err)
      });
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

    this.hasBreaks.set(!this.newService.requiresHairLength && ((this.newService.timeSegments?.length || 0) > 1));
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
      const total = this.newService.timeSegments.reduce((acc, curr) => acc + curr.duration + (curr.breakAfter || 0), 0);
      this.newService.timeSegments = [{ duration: total, breakAfter: 0 }];
    }
  }

  onRequireHairLengthChanged() {
    if (this.newService.requiresHairLength) {
      this.hasBreaks.set(false);
      if (!this.newService.hairLengthModifiers) {
        this.newService.hairLengthModifiers = Service.defaultHairLengthModifiers();
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
    this.expandedServiceIndexes.update(set => {
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
          el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        }
      }, 100);
    } catch { }
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
      if (this.newService.timeSegments.length > 0 && this.newService.timeSegments[0].duration > 15) {
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
    this.newService.hairLengthModifiers[length].segments!.push({ duration: 30, breakAfter: 0 });
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
  private async uploadImageIfSelected(): Promise<string | null> {
    if (!this.selectedFile) return null;

    const photo = new GalleryPhoto(this.selectedFile.name, 'temp-id', undefined, false, PhotoType.SERVICE);
    const { task } = await this.uploadPhotoUseCase.execute(this.selectedFile, photo);

    this.uploadSubscription?.unsubscribe();
    this.isUploading.set(true);

    this.uploadSubscription = percentage(task).subscribe(({ progress }) => {
      this.uploadProgress.set(`${progress}%`);
    });

    try {
      const snapshot = await task;
      return await getDownloadURL(snapshot.ref);
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

