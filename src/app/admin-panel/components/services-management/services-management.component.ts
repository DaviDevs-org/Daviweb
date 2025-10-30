import { Component, ElementRef, inject, Injector, runInInjectionContext, signal, ViewChild, OnDestroy, AfterViewInit, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { percentage } from '@angular/fire/storage';
import { combineLatest, Subscription } from 'rxjs';
import { ServiceManager } from '../../../services/admin-panel/services-management.service';
import { GalleryService } from '../../../services/admin-panel/gallery-management.service';
import { Service, NewService, TimeSegment, HairLengthModifiers } from '../../types/admin.types';
import { AlertService } from '../../../services/alert/alert.service';
import { ImageProcessingService } from '../../../services/image-processing.service';

@Component({
  selector: 'app-services-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services-management.component.html',
  styleUrls: ['./services-management.component.scss']
})
export class ServicesManagementComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('formTop') formTop!: ElementRef<HTMLDivElement>;

  private scrollSub: Subscription | null = null;

  private auth = inject(Auth);
  private injector = inject(Injector);
  private service = inject(ServiceManager);
  private galleryService = inject(GalleryService);
  private toast = inject(AlertService);
  private imageProcessor = inject(ImageProcessingService);
  private cdr = inject(ChangeDetectorRef);

  services: Service[] = [];
  lengths: ('short' | 'medium' | 'long')[] = ['short', 'medium', 'long'];
  selectedFile: File | null = null;
  imagePreviewUrl: string = '';
  processedBlob: Blob | null = null;
  uploadProgress = signal('0%');
  isUploading: boolean = false;
  uploadSubscription: Subscription | undefined = undefined;
  hasBreaks: boolean = false;
  // Estado de edición
  isEditing: boolean = false;
  private editServiceId: string | null = null;
  private existingImageUrl: string | undefined;


  newService: NewService = {
    name: '',
    description: '',
    timeSegments: [{ duration: 30, breakAfter: 0 }],
    requiresHairLength: false,
    hairLengthModifiers: {
      short: { time: 30 },
      medium: { time: 45 },
      long: { time: 60 }
    }
  };


  ngOnInit() {
    runInInjectionContext(this.injector, () => {
      onAuthStateChanged(this.auth, user => {
        if (user) {
          user.getIdToken().then(() => {
            this.service.getServices().subscribe(service => {
              this.services = service;
            });
          });
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.scrollSub) this.scrollSub.unsubscribe();
    if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl);
    this.uploadSubscription?.unsubscribe();
  }

  async onFileSelected(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;

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

    try {
      const { blob } = await this.imageProcessor.processGeneric(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.84 });
      this.selectedFile = file;
      this.processedBlob = blob;

      if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = URL.createObjectURL(blob);
    } catch (e) {
      this.toast.error('No se pudo procesar la imagen.');
    }
  }

  private async uploadImageIfSelected(): Promise<string | null> {
    if (!this.selectedFile) return null;

    return new Promise((resolve, reject) => {
      const task = this.galleryService.uploadServiceImage(this.processedBlob || this.selectedFile!, this.selectedFile!.name);
      if (!task) return reject('Error al iniciar la subida');

      this.uploadSubscription?.unsubscribe();
      this.isUploading = true;

      this.uploadSubscription = percentage(task).subscribe(({ progress }) => {
        this.uploadProgress.set(`${progress}%`);
      });

      task.on('state_changed',
        null,
        (error) => {
          console.error('Error al subir:', error);
          this.isUploading = false;
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await this.galleryService.getUrl(task.snapshot.ref);
            this.isUploading = false;
            this.uploadProgress.set('0%');
            this.clearFileSelection();
            resolve(downloadURL);
          } catch (error) {
            this.isUploading = false;
            reject(error);
          }
        }
      );
    });
  }

  private clearFileSelection(): void {
    this.selectedFile = null;
    this.processedBlob = null;

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = '';
    }

    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  lengthMap: Record<'short' | 'medium' | 'long', string> = {
    short: 'Corto',
    medium: 'Medio',
    long: 'Largo'
  };

  async addService(): Promise<void> {
    if (!this.selectedFile) { this.toast.error('Por favor, escoja una imagen.'); return; }
    if (!this.newService.name.trim()) { this.toast.error('Por favor, ingresa el nombre del servicio.'); return; }

    // Validaciones según modo
    if (this.newService.requiresHairLength) {
      // Asegurar estructura inicial
      if (!this.newService.hairLengthModifiers) {
        this.newService.hairLengthModifiers = {
          short: { time: 30 },
          medium: { time: 45 },
          long: { time: 60 }
        };
      }

      // Validar que cada longitud tenga tiempo o segmentos con total > 0
      const lengths: Array<'short' | 'medium' | 'long'> = ['short', 'medium', 'long'];
      let allValid = true;
      for (const l of lengths) {
        const mod = this.newService.hairLengthModifiers[l];
        const segsTotal = (mod.segments ?? []).reduce((a, s) => a + (s.duration || 0) + (s.breakAfter || 0), 0);
        const total = segsTotal > 0 ? segsTotal : (mod.time || 0);
        if (total <= 0) { allValid = false; break; }
      }
      if (!allValid) { this.toast.error('Configura un tiempo válido para cada longitud de pelo.'); return; }
    } else {
      const hasValidSegment = this.newService.timeSegments.some(seg => seg.duration > 0);
      if (!hasValidSegment) { this.toast.error('Por favor, ingresa al menos un segmento de tiempo válido.'); return; }
    }

    try {
      const imageUrl = await this.uploadImageIfSelected() || undefined;

      // Si es por longitud, sincronizamos modifier.time con la suma de segmentos (si hay) y limpiamos timeSegments
      let timeSegmentsToSave = this.newService.timeSegments;
      let hairLengthModsToSave = this.newService.hairLengthModifiers;

      if (this.newService.requiresHairLength) {
        const mods = this.newService.hairLengthModifiers!;
        (['short', 'medium', 'long'] as const).forEach(l => {
          const segs = mods[l].segments ?? [];
          if (segs.length > 0) {
            const total = segs.reduce((a, s) => a + (s.duration || 0) + (s.breakAfter || 0), 0);
            mods[l].time = total; // mantener compatibilidad con AppointmentService
          } else {
            mods[l].time = mods[l].time || 0;
          }
        });
        hairLengthModsToSave = mods;
        timeSegmentsToSave = []; // evitar confusiones aguas abajo
      }

      // Sanitizar modifiers para evitar undefined en Firestore
      if (hairLengthModsToSave) {
        hairLengthModsToSave = this.sanitizeHairLengthModifiers(hairLengthModsToSave);
      }

      const serviceNew = new Service(
        this.newService.name,
        this.newService.description,
        timeSegmentsToSave,
        this.newService.requiresHairLength || false,
        hairLengthModsToSave || {
          short: { time: 0 },
          medium: { time: 0 },
          long: { time: 0 }
        },
        imageUrl
      );

      await this.service.addService(serviceNew);

      this.newService = {
        name: '',
        description: '',
        timeSegments: [{ duration: 30, breakAfter: 0 }],
        requiresHairLength: false,
        hairLengthModifiers: {
          short: { time: 30 },
          medium: { time: 45 },
          long: { time: 60 }
        }
      };

      this.clearFileSelection();
      this.toast.success('Servicio añadido correctamente!');
    } catch (error) {
      console.error('Error al añadir servicio:', error);
      this.toast.error('Error al añadir el servicio. Por favor, inténtalo de nuevo.');
    }
    return;
  }

  async editService(index: number) {
    // Cargar el servicio seleccionado en el formulario para editarlo
    const serviceU = this.services[index];
    this.populateFormFromService(serviceU);
  }

  private populateFormFromService(service: Service) {
    // Marcar estado de edición y conservar id/imagen actual
    this.isEditing = true;
    this.editServiceId = service.id ?? null;
    this.existingImageUrl = service.imageUrl;

    // Limpiar selección de archivo previa y mostrar preview con la URL existente
    this.selectedFile = null;
    this.processedBlob = null;
    if (this.imagePreviewUrl) URL.revokeObjectURL(this.imagePreviewUrl);
    this.imagePreviewUrl = service.imageUrl || '';
    if (this.fileInput) this.fileInput.nativeElement.value = '';

    // Rellenar formulario
    const mapSegments = (segs?: TimeSegment[]) => (segs && segs.length > 0)
      ? segs.map(seg => ({ duration: seg.duration, breakAfter: seg.breakAfter || 0 }))
      : undefined; // importante: no generar 'segments: undefined'

    this.newService = {
      name: service.name,
      description: service.description,
      timeSegments: (service.timeSegments && service.timeSegments.length)
        ? service.timeSegments.map(s => ({ duration: s.duration, breakAfter: s.breakAfter || 0 }))
        : [{ duration: 30, breakAfter: 0 }],
      requiresHairLength: service.requiresHairLength ?? false,
      hairLengthModifiers: service.hairLengthModifiers
        ? {
            short: {
              time: service.hairLengthModifiers.short?.time || 0,
              ...(mapSegments(service.hairLengthModifiers.short?.segments) ? { segments: mapSegments(service.hairLengthModifiers.short?.segments)! } : {})
            },
            medium: {
              time: service.hairLengthModifiers.medium?.time || 0,
              ...(mapSegments(service.hairLengthModifiers.medium?.segments) ? { segments: mapSegments(service.hairLengthModifiers.medium?.segments)! } : {})
            },
            long: {
              time: service.hairLengthModifiers.long?.time || 0,
              ...(mapSegments(service.hairLengthModifiers.long?.segments) ? { segments: mapSegments(service.hairLengthModifiers.long?.segments)! } : {})
            }
          }
        : { short: { time: 30 }, medium: { time: 45 }, long: { time: 60 } }
    };

    // Definir si mostrar modo segmentos
    this.hasBreaks = !this.newService.requiresHairLength && ((this.newService.timeSegments?.length || 0) > 1);

    // Hacer scroll suave al formulario
    this.scrollToForm();
  }

  async onSubmit() {
    if (this.isEditing) {
      await this.updateServiceFromForm();
    } else {
      await this.addService();
    }
  }

  private scrollToForm() {
    try {
      const doScroll = () => {
        const el = this.formTop?.nativeElement;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        }
      };

      // Forzamos CD y esperamos a que el layout se estabilice antes de hacer scroll
      this.cdr.detectChanges();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // fallback mínimo por si aún no se ha terminado de pintar
          setTimeout(doScroll, 0);
        });
      });
    } catch {}
  }

  private async updateServiceFromForm(): Promise<void> {
    if (!this.editServiceId) { this.toast.error('No se ha podido identificar el servicio a actualizar.'); return; }

    if (!this.newService.name.trim()) { this.toast.error('Por favor, ingresa el nombre del servicio.'); return; }

    // Validaciones según modo
    if (this.newService.requiresHairLength) {
      if (!this.newService.hairLengthModifiers) {
        this.newService.hairLengthModifiers = {
          short: { time: 30 },
          medium: { time: 45 },
          long: { time: 60 }
        };
      }

      const lengths: Array<'short' | 'medium' | 'long'> = ['short', 'medium', 'long'];
      let allValid = true;
      for (const l of lengths) {
        const mod = this.newService.hairLengthModifiers[l];
        const segsTotal = (mod.segments ?? []).reduce((a, s) => a + (s.duration || 0) + (s.breakAfter || 0), 0);
        const total = segsTotal > 0 ? segsTotal : (mod.time || 0);
        if (total <= 0) { allValid = false; break; }
      }
      if (!allValid) { this.toast.error('Configura un tiempo válido para cada longitud de pelo.'); return; }
    } else {
      const hasValidSegment = this.newService.timeSegments.some(seg => seg.duration > 0);
      if (!hasValidSegment) { this.toast.error('Por favor, ingresa al menos un segmento de tiempo válido.'); return; }
    }

    try {
      // Subir nueva imagen si el usuario ha seleccionado una, si no conservar la existente
      const imageUrl = (this.selectedFile ? (await this.uploadImageIfSelected()) : this.existingImageUrl) || undefined;

      let timeSegmentsToSave = this.newService.timeSegments;
      let hairLengthModsToSave = this.newService.hairLengthModifiers;

      if (this.newService.requiresHairLength) {
        const mods = this.newService.hairLengthModifiers!;
        (['short', 'medium', 'long'] as const).forEach(l => {
          const segs = mods[l].segments ?? [];
          if (segs.length > 0) {
            const total = segs.reduce((a, s) => a + (s.duration || 0) + (s.breakAfter || 0), 0);
            mods[l].time = total;
          } else {
            mods[l].time = mods[l].time || 0;
          }
        });
        hairLengthModsToSave = mods;
        timeSegmentsToSave = [];
      }

      // Sanitizar modifiers para evitar undefined en Firestore
      if (hairLengthModsToSave) {
        hairLengthModsToSave = this.sanitizeHairLengthModifiers(hairLengthModsToSave);
      }

      const updatedService = new Service(
        this.newService.name,
        this.newService.description,
        timeSegmentsToSave,
        this.newService.requiresHairLength || false,
        hairLengthModsToSave || {
          short: { time: 0 },
          medium: { time: 0 },
          long: { time: 0 }
        },
        imageUrl
      );

      await this.service.updateService(this.editServiceId, updatedService);

      // Resetear estado
      this.resetForm();
      this.toast.success('Servicio actualizado correctamente!');
    } catch (error) {
      console.error('Error al actualizar servicio:', error);
      this.toast.error('Error al actualizar el servicio. Por favor, inténtalo de nuevo.');
    }
  }

  // Eliminar claves undefined y normalizar arrays/valores
  private sanitizeHairLengthModifiers(mods: HairLengthModifiers): HairLengthModifiers {
    const cleanSegs = (segs: TimeSegment[] | undefined): TimeSegment[] | undefined => {
      if (!Array.isArray(segs)) return undefined;
      const normalized = segs
        .filter(s => s && typeof s.duration === 'number' && s.duration >= 0)
        .map(s => ({ duration: s.duration, breakAfter: s.breakAfter ? s.breakAfter : 0 }));
      return normalized.length > 0 ? normalized : undefined;
    };

    const build = (m: { time?: number; segments?: TimeSegment[] | undefined } | undefined) => {
      const time = typeof m?.time === 'number' ? m!.time : 0;
      const segs = cleanSegs(m?.segments);
      return segs ? { time, segments: segs } : { time };
    };

    return {
      short: build(mods.short),
      medium: build(mods.medium),
      long: build(mods.long)
    } as HairLengthModifiers;
  }

  cancelEditing() {
    this.resetForm();
  }

  private resetForm() {
    this.newService = {
      name: '',
      description: '',
      timeSegments: [{ duration: 30, breakAfter: 0 }],
      requiresHairLength: false,
      hairLengthModifiers: {
        short: { time: 30 },
        medium: { time: 45 },
        long: { time: 60 }
      }
    };
    this.hasBreaks = false;
    this.isEditing = false;
    this.editServiceId = null;
    this.existingImageUrl = undefined;
    this.clearFileSelection();
  }

  async deleteService(index: number) {
    const service = this.services[index];
    if (await this.toast.confirm(`¿Estás seguro de que quieres eliminar "${service.name}"?`)) {
      await this.service.deleteService(service.id!);
      this.toast.success(`El servicio ${service.name} ha sido borrado con éxito`);
    }
  }

  addTimeSegment() {
    if (this.hasBreaks) {
      this.newService.timeSegments.push({ duration: 30, breakAfter: 0 });
    } else {
      this.newService.timeSegments[0].duration += 30;
    }
  }

  removeTimeSegment(index: number) {
    if (this.hasBreaks) {
      if (this.newService.timeSegments.length > 1) this.newService.timeSegments.splice(index, 1);
    } else {
      if (this.newService.timeSegments[0].duration > 15) this.newService.timeSegments[0].duration -= 15;
    }
  }

  addHairLengthSegment(length: 'short' | 'medium' | 'long') {
    if (!this.newService.requiresHairLength) return;
    if (!this.newService.hairLengthModifiers) {
      this.newService.hairLengthModifiers = {
        short: { time: 30, segments: [] },
        medium: { time: 45, segments: [] },
        long: { time: 60, segments: [] }
      };
    }

    const modifier = this.newService.hairLengthModifiers[length];

    if (!modifier.segments) modifier.segments = [];
    // Añadir UN único segmento por interacción
    modifier.segments.push({ duration: modifier.time || 30, breakAfter: 0 });
  }


  removeHairLengthSegment(length: 'short' | 'medium' | 'long', index: number) {
    if (!this.newService.requiresHairLength) return;
    if (!this.newService.hairLengthModifiers) return;

    const modifier = this.newService.hairLengthModifiers[length];
    if (!modifier?.segments) return;

    modifier.segments.splice(index, 1);
  }


  // Mantener compatibilidad: alias que ahora añade un solo segmento
  addTwoHairLengthSegments(length: 'short' | 'medium' | 'long') {
    this.addHairLengthSegment(length);
  }





  toggleBreaks() {
    if (this.newService.requiresHairLength) return; // no aplica en modo por longitud
    this.hasBreaks = !this.hasBreaks;
    if (this.hasBreaks && this.newService.timeSegments.length === 1) {
      this.newService.timeSegments.push({ duration: 30, breakAfter: 0 });
    } else if (!this.hasBreaks) {
      this.newService.timeSegments = [{ duration: this.newService.timeSegments[0].duration, breakAfter: 0 }];
    }
  }

  toggleHairLengthSegments(length: 'short' | 'medium' | 'long') {
    if (!this.newService.requiresHairLength) return;

    if (!this.newService.hairLengthModifiers) {
      // Inicializamos los modifiers si no existen
      this.newService.hairLengthModifiers = {
        short: { time: 30, segments: [] },
        medium: { time: 45, segments: [] },
        long: { time: 60, segments: [] }
      };
    }

    const modifier = this.newService.hairLengthModifiers[length];
    if (!modifier) return;

    if (!modifier.segments) modifier.segments = [];

    if (modifier.segments.length === 0) {
      modifier.segments.push({ duration: modifier.time, breakAfter: 0 });
    } else if (modifier.segments.length === 1) {
      modifier.segments.push({ duration: modifier.time, breakAfter: 0 });
    }
  }

  onRequireHairLengthChanged() {
    if (this.newService.requiresHairLength) {
      // Desactivar breaks del modo normal
      this.hasBreaks = false;
      // Simplificar segmentos globales
      if (!this.newService.timeSegments || this.newService.timeSegments.length === 0) {
        this.newService.timeSegments = [{ duration: 30, breakAfter: 0 }];
      } else {
        this.newService.timeSegments = [{ duration: this.newService.timeSegments[0].duration || 30, breakAfter: 0 }];
      }
      // Inicializar modifiers si hiciera falta
      if (!this.newService.hairLengthModifiers) {
        this.newService.hairLengthModifiers = {
          short: { time: 30, segments: [] },
          medium: { time: 45, segments: [] },
          long: { time: 60, segments: [] }
        };
      }
    }
  }



  getEstimatedTime(service: Service) {
    if (!service.requiresHairLength || !service.hairLengthModifiers) return '—';

    let minTime = Infinity;
    let maxTime = 0;

    for (let length of this.lengths) {
      const modifier = service.hairLengthModifiers[length];
      if (!modifier) continue;

      let total = 0;
      if (modifier.segments?.length) {
        total = modifier.segments.reduce((acc, seg) => acc + (seg.duration || 0) + (seg.breakAfter || 0), 0);
      } else if (modifier.time) {
        total = modifier.time;
      }

      if (total > 0) {
        if (total < minTime) minTime = total;
        if (total > maxTime) maxTime = total;
      }
    }

    if (minTime === Infinity) return '—';
    return minTime === maxTime ? `${minTime} min` : `${minTime}-${maxTime} min`;
  }

  convertToService(newService: NewService): Service {
    return new Service(
      newService.name,
      newService.description,
      newService.timeSegments,
      newService.requiresHairLength ?? false,
      newService.hairLengthModifiers
    );
  }



  getTotalTime(segments: TimeSegment[]): number {
    return segments.reduce((total, seg) => total + seg.duration + (seg.breakAfter || 0), 0);
  }

  getActiveTime(segments: TimeSegment[]): number {
    return segments.reduce((total, seg) => total + seg.duration, 0);
  }

  getBreakTime(segments: TimeSegment[]): number {
    return segments.reduce((total, seg) => total + (seg.breakAfter || 0), 0);
  }
}
