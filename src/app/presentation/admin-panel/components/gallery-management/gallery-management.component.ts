// gallery-management.component.ts
import { Component, ElementRef, inject, signal, ViewChild, OnDestroy, Injector, runInInjectionContext, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryPhoto } from '../../../../admin-panel/types/admin.types';
import { GalleryService } from '../../../../services/admin-panel/gallery-management.service';
import { Subscription } from 'rxjs';
import { percentage } from '@angular/fire/storage';
import { AlertService } from '../../../../shared/alert/alert.service';
import { ImageProcessingService } from '../../../../services/image-processing.service';


@Component({
  selector: 'app-gallery-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./gallery-management.component.html",
  styleUrls: ['./gallery-management.component.scss']
})
export class GalleryManagementComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  private gallery = inject(GalleryService)
  private toast = inject(AlertService)
  private injector = inject(Injector)
  private cdr = inject(ChangeDetectorRef)
  private imageProcessor = inject(ImageProcessingService)

  selectedFile: File | null = null;
  processedBlob: Blob | null = null;
  imagePreviewUrl: string = '';
  progress = signal('0%');
  susbscription: Subscription | undefined = undefined;
  galleryPhotos = signal<GalleryPhoto[]>([])
  isLoading = signal(true);
  imageLoadStates: boolean[] = [];

  ngOnInit() {
    runInInjectionContext(this.injector, async () => {
      const images = await this.gallery.getImages()
      const gallery = await this.gallery.getImageInfo(images)
      this.galleryPhotos.set(gallery)
      this.imageLoadStates = new Array(gallery.length).fill(false);
      this.isLoading.set(false)
    });
  }
  onImageLoad(index: number) {
    this.imageLoadStates[index] = true;
    this.cdr.detectChanges();
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
      // Comprobar orientación horizontal mínima (evitar verticales en carrusel)
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        if (img.width < img.height) {
          this.toast.error('Por favor, usa una imagen horizontal (apaisada).');
          URL.revokeObjectURL(url);
          return;
        }
        try {
          const { blob } = await this.imageProcessor.processForCarousel(file, { maxWidth: 1600, quality: 0.82 });
          this.selectedFile = file;
          this.processedBlob = blob;
          // Limpiar URL anterior si existe
          if (this.imagePreviewUrl) {
            URL.revokeObjectURL(this.imagePreviewUrl);
          }
          this.imagePreviewUrl = URL.createObjectURL(blob);
        } catch (e) {
          this.toast.error('No se pudo procesar la imagen.');
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => {
        this.toast.error('No se pudo cargar la imagen.');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  }

  uploadImage() {
    if (!this.selectedFile || !this.processedBlob) {
      this.toast.error('Por favor, selecciona una imagen primero.');
      return;
    }

    const task = this.gallery.uploadImage(this.processedBlob, this.selectedFile.name);
    if (!task) { return; }

    if (this.susbscription) {
      this.susbscription.unsubscribe();
      this.susbscription = undefined;
    }

    this.susbscription = percentage(task).subscribe(({ progress }) => {
      this.progress.set(`${progress}%`);
    });

    task.on('state_changed',
      null,
      (error) => {
        console.error('Error al subir:', error);
      },
      async () => {
        const downloadURL = await this.gallery.getUrl(task.snapshot.ref);

        this.galleryPhotos.update(images => [
          ...images,
          new GalleryPhoto(
            this.selectedFile!.name.replace(/\.(jpe?g|png|webp)$/i, '.webp'),
            downloadURL,
            this.selectedFile!.lastModified.toString(),
            task.snapshot.ref.name
          )
        ]);

        this.selectedFile = null;
        this.processedBlob = null;

        // Limpiar la URL de previsualización
        if (this.imagePreviewUrl) {
          URL.revokeObjectURL(this.imagePreviewUrl);
          this.imagePreviewUrl = '';
        }

        setTimeout(() => {
          this.toast.success('Foto subida con éxito');
          this.progress.set('0%');
        }, 400);
      }
    );
  }

  async deleteImage(i: number) {
    if (! await this.toast.confirm('¿Estás seguro de que deseas eliminar esta imagen?')) {
      return;
    } else {
      const id = this.galleryPhotos()[i].id!
      const response = await this.gallery.deleteImage(id)
      this.galleryPhotos.update(photos =>
        photos.filter((_, index) => index !== i)
      );
      this.toast.success("Foto eliminada con éxito");
    }
  }

  async updateImage(i: number) {
    const id = this.galleryPhotos()[i].id!;
    let newName: string | false | null = "";

    newName = await this.toast.prompt('Introduzca un nuevo nombre para la imagen')
    if (newName === null) {
      this.toast.error('Por favor, ingrese un nombre para la imagen');
      return;
    }
    if (newName == false) return;

    newName = newName + '.' + this.galleryPhotos()[i].name.split('.').pop()
    const response = await this.gallery.updateImage(id, newName)
    this.galleryPhotos.update(photos => {
      const updated = [...photos];
      updated[i] = {
        ...updated[i],
        name: newName
      };
      return updated;
    });
  }

  ngOnDestroy() {
    // Limpiar la URL de previsualización al destruir el componente
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    // Limpiar suscripción si existe
    if (this.susbscription) {
      this.susbscription.unsubscribe();
    }
  }

}