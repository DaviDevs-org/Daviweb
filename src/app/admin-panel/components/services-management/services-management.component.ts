// services-management.component.ts
import { Component, ElementRef, inject, Injector, runInInjectionContext, signal, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { percentage } from '@angular/fire/storage';
import { Subscription } from 'rxjs';
import { ServiceManager } from '../../../services/admin-panel/services-management.service';
import { GalleryService } from '../../../services/admin-panel/gallery-management.service';
import { Service, NewService, TimeSegment } from '../../types/admin.types';
import { AlertService } from '../../../services/alert/alert.service';

@Component({
  selector: 'app-services-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./services-management.component.html",
  styleUrls: ['./services-management.component.scss']
})
export class ServicesManagementComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private auth = inject(Auth);
  private injector = inject(Injector);
  private service = inject(ServiceManager);
  private galleryService = inject(GalleryService);
  private toast = inject(AlertService)

  services: Service[] = [];
  selectedFile: File | null = null;
  imagePreviewUrl: string = '';
  uploadProgress = signal('0%');
  isUploading: boolean = false;
  uploadSubscription: Subscription | undefined = undefined;
  hasBreaks: boolean = false;

  newService: NewService = {
    name: '',
    price: 0,
    description: '',
    timeSegments: [{ duration: 30, breakAfter: 0 }] // Inicializar con un segmento
  };

  ngOnInit() {
    runInInjectionContext(this.injector, () => {
      onAuthStateChanged(this.auth, user => {
        if (user) {
          user.getIdToken().then(token => {
            this.service.getServices().subscribe(service => {
              this.services = service;
            });
          });
        }
      });
    });
  }

  onFileSelected(event: Event): void {
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

      // Limpiar URL anterior si existe
      if (this.imagePreviewUrl) {
        URL.revokeObjectURL(this.imagePreviewUrl);
      }

      this.selectedFile = file;
      this.imagePreviewUrl = URL.createObjectURL(file);
    }
  }

  private async uploadImageIfSelected(): Promise<string | null> {
    if (!this.selectedFile) {
      return null;
    }

    return new Promise((resolve, reject) => {
      const task = this.galleryService.uploadServiceImage(this.selectedFile!);
      if (!task) {
        reject('Error al iniciar la subida');
        return;
      }

      if (this.uploadSubscription) {
        this.uploadSubscription.unsubscribe();
        this.uploadSubscription = undefined;
      }

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

            // Limpiar la selección de archivo
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

    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
      this.imagePreviewUrl = '';
    }

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  async addService() {
    if (!this.selectedFile) {
      this.toast.error('Por favor, escoja una imagen.')
      return
    }
    if (!this.newService.name.trim()) {
      this.toast.error('Por favor, ingresa el nombre del servicio.');
      return;
    }

    if (this.newService.price <= 0) {
      this.toast.error('Por favor, ingresa un precio válido.');
      return;
    }
    const hasValidSegment = this.newService.timeSegments.some(segment => segment.duration > 0);
    if (!hasValidSegment) {
      this.toast.error('Por favor, ingresa al menos un segmento de tiempo válido.');
      return;
    }

    try {
      // Subir imagen si está seleccionada
      let imageUrl: string | undefined = undefined;

      if (this.selectedFile) {
        imageUrl = await this.uploadImageIfSelected() || undefined;
      }

      // Crear el servicio con la URL de la imagen si existe
      const serviceNew = new Service(
        this.newService.name,
        this.newService.description,
        this.newService.timeSegments,
        this.newService.price,
        imageUrl!
      );

      const response = await this.service.addService(serviceNew);
      console.log(response);

      // Resetear el formulario
      this.newService = {
        name: '',
        price: 0,
        description: '',
        timeSegments: [{ duration: 0, breakAfter: 0 }]
      };

      this.clearFileSelection();

      this.toast.success('Servicio añadido correctamente!');

    } catch (error) {
      console.error('Error al añadir servicio:', error);
      this.toast.error('Error al añadir el servicio. Por favor, inténtalo de nuevo.');
    }
  }

  async editService(index: number) {
    const serviceU = this.services[index];

    const newName = await this.toast.prompt(
      'Nuevo nombre del servicio:',
      'Nombre del servicio...'
    );
    if (newName === null) {
      this.toast.error('Por favor, introduzca un nombre')
      return
    };
    if (newName == false) return;

    const newPriceStr = await this.toast.promptNumber(
      'Nuevo precio (€):',
      'Ej: 25.50'
    );
    if (newPriceStr === null) {
      this.toast.error('Por favor, introduzca un precio válido');
      return;
    }
    if (newPriceStr === false) return;

    const newPrice = parseFloat(newPriceStr!);
    if (isNaN(newPrice) || newPrice <= 0) {
      this.toast.error('Por favor, ingresa un precio válido.');
      return;
    }

    const timeSegments: TimeSegment[] = [];
    let addMoreSegments = true;
    while (addMoreSegments) {
      const durationStr = await this.toast.promptNumber(
        `Duración del segmento ${timeSegments.length + 1} (min):`,
        'Ej: 30'
      );
      if (durationStr === null || durationStr === false) break;
      const duration = parseInt(durationStr);
      if (isNaN(duration) || duration <= 0) {
        this.toast.error('Por favor, ingresa una duración válida.');
        break;
      }

      const breakAfterStr = await this.toast.promptNumber(
        `Tiempo de pausa después de este segmento (min, 0 si no hay pausa):`,
        'Ej: 15'
      );
      if (breakAfterStr === null || breakAfterStr === false) break;

      const breakAfter = parseInt(breakAfterStr) || 0;

      timeSegments.push({ duration, breakAfter });

      addMoreSegments = await this.toast.confirm('¿Quieres añadir otro segmento de tiempo?');
    }
    if (timeSegments.length === 0) {
      this.toast.error('El servicio debe tener al menos un segmento de tiempo.');
      return;
    }


    const newDescription = await this.toast.prompt(
      'Nueva descripción:',
      'Descripción del servicio...'
    );
    if (newDescription === null) {
      this.toast.error('Por favor, introduzca un precio válido');
      return;
    }
    if (newDescription == false) return;

    const updatedService = new Service(
      newName,
      newDescription,
      timeSegments,
      newPrice,
      serviceU.imageUrl!
    );

    const response = await this.service.updateService(serviceU.id!, updatedService);
    this.toast.success('Servicio actualizado correctamente!');
  }

  async deleteService(index: number) {
    const service = this.services[index];

    if (await this.toast.confirm(`¿Estás seguro de que quieres eliminar "${service.name}"?`)) {
      const response = await this.service.deleteService(service.id!);
      this.toast.success(`El servicio ${service.name} ha sido borrado con éxito`);
    }
  }


  addTimeSegment() {
    if (this.hasBreaks) {
      this.newService.timeSegments.push({ duration: 30, breakAfter: 0 });
    } else {
      // Si no tiene breaks, simplemente aumentar la duración del único segmento
      this.newService.timeSegments[0].duration += 30;
    }
  }

  // Modificar removeTimeSegment
  removeTimeSegment(index: number) {
    if (this.hasBreaks) {
      if (this.newService.timeSegments.length > 1) {
        this.newService.timeSegments.splice(index, 1);
      }
    } else {
      // Si no tiene breaks, reducir la duración pero mantener mínimo 15min
      if (this.newService.timeSegments[0].duration > 15) {
        this.newService.timeSegments[0].duration -= 15;
      }
    }
  }

  ngOnDestroy() {
    // Limpiar la URL de previsualización al destruir el componente
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    // Limpiar suscripción si existe
    if (this.uploadSubscription) {
      this.uploadSubscription.unsubscribe();
    }
  }
  getTotalTime(segments: TimeSegment[]): number {
    return segments.reduce((total, segment) =>
      total + segment.duration + (segment.breakAfter || 0), 0);
  }

  getActiveTime(segments: TimeSegment[]): number {
    return segments.reduce((total, segment) => total + segment.duration, 0);
  }

  getBreakTime(segments: TimeSegment[]): number {
    return segments.reduce((total, segment) => total + (segment.breakAfter || 0), 0);
  }

  toggleBreaks() {
    this.hasBreaks = !this.hasBreaks;
    
    if (this.hasBreaks) {
      // Si activa breaks, asegurar que hay al menos 2 segmentos
      if (this.newService.timeSegments.length === 1) {
        this.newService.timeSegments.push({ duration: 30, breakAfter: 0 });
      }
    } else {
      // Si desactiva breaks, eliminar todos los breaks y dejar solo un segmento
      this.newService.timeSegments = [{ duration: this.newService.timeSegments[0].duration, breakAfter: 0 }];
    }
  }
}