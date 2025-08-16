// services-management.component.ts
import { Component, ElementRef, inject, Injector, runInInjectionContext, signal, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { percentage } from '@angular/fire/storage';
import { Subscription } from 'rxjs';
import { ServiceManager } from '../../../services/admin-panel/services-management.service';
import { GalleryService } from '../../../services/admin-panel/gallery-management.service';
import { Service, NewService } from '../../types/admin.types';

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

  services: Service[] = [];
  selectedFile: File | null = null;
  imagePreviewUrl: string = '';
  uploadProgress = signal('0%');
  isUploading: boolean = false;
  uploadSubscription: Subscription | undefined = undefined;

  newService: NewService = {
    name: '',
    price: 0,
    description: '',
    time: 0
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
        alert('Por favor, selecciona una imagen JPG, PNG o WebP.');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
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
    if (!this.selectedFile){
      alert('Por favor, escoja una imagen.')
      return
    }
    if (!this.newService.name.trim()) {
      alert('Por favor, ingresa el nombre del servicio.');
      return;
    }

    if (this.newService.price <= 0) {
      alert('Por favor, ingresa un precio válido.');
      return;
    }

    if (this.newService.time <= 0) {
      alert('Por favor, ingresa un tiempo válido.');
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
        this.newService.time, 
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
        time: 0
      };

      this.clearFileSelection();
      
      alert('Servicio añadido correctamente!');
      
    } catch (error) {
      console.error('Error al añadir servicio:', error);
      alert('Error al añadir el servicio. Por favor, inténtalo de nuevo.');
    }
  }

  async editService(index: number) {
    const serviceU = this.services[index];
    
    const newName = prompt('Nuevo nombre del servicio:', serviceU.name);
    if (newName === null) return;

    const newPriceStr = prompt('Nuevo precio (€):', serviceU.price.toString());
    if (newPriceStr === null) return;

    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Por favor, ingresa un precio válido.');
      return;
    }

    const newTimeStr = prompt('Nuevo tiempo (min):', serviceU.time.toString());
    if (newTimeStr === null) return;

    const newTime = parseFloat(newTimeStr);
    if (isNaN(newTime) || newTime <= 0) {
      alert('Por favor, ingresa un tiempo estimado válido.');
      return;
    }
    
    const newDescription = prompt('Nueva descripción:', serviceU.description);
    if (newDescription === null) return;

    const updatedService = new Service(
      newName, 
      newDescription, 
      newTime, 
      newPrice,
      serviceU.imageUrl! // Mantener la imagen actual
    );

    const response = await this.service.updateService(serviceU.id!, updatedService);

    alert('Servicio actualizado correctamente!');
  }

  async deleteService(index: number) {
    const service = this.services[index];
    
    if (confirm(`¿Estás seguro de que quieres eliminar "${service.name}"?`)) {
      const response = await this.service.deleteService(service.id!);
      alert(`El servicio ${service.name} ha sido borrado con éxito`);
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
}