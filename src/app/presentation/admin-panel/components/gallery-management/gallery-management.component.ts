import {
  Component,
  ElementRef,
  signal,
  ViewChild,
  OnDestroy,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { GalleryPhoto, PhotoType } from '@domain/gallery';

import {
  GetPhotosUseCase,
  UploadPhotoUseCase,
  DeletePhotoUseCase,
} from '@application/gallery';

// Shared
import { AlertService } from '@presentation/shared/alert/alert.service';

@Component({
  selector: 'app-gallery-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gallery-management.component.html',
  styleUrls: ['./gallery-management.component.scss'],
})
export class GalleryManagementComponent implements OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // ========================
  // DEPENDENCIAS - USE CASES
  // ========================
  private getPhotosUseCase = inject(GetPhotosUseCase);
  private uploadPhotoUseCase = inject(UploadPhotoUseCase);
  private deletePhotoUseCase = inject(DeletePhotoUseCase);
  private toast = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  // ========================
  // ESTADO DEL COMPONENTE
  // ========================
  selectedFile: File | null = null;
  imagePreviewUrl: string = '';
  progress = signal('0%');
  subscription: Subscription | undefined = undefined;
  galleryPhotos = signal<GalleryPhoto[]>([]);
  isLoading = signal(true);
  imageLoadStates: boolean[] = [];

  // ========================
  // LIFECYCLE
  // ========================

  ngOnInit() {
    this.loadGalleryPhotos();
  }

  ngOnDestroy() {
    // Limpiar la URL de previsualización
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }

    // Limpiar suscripción si existe
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  // ========================
  // CARGA DE DATOS
  // ========================

  private async loadGalleryPhotos() {
    try {
      this.isLoading.set(true);

      // ✅ USAMOS EL USE CASE PARA OBTENER FOTOS
      this.getPhotosUseCase.execute(PhotoType.GALLERY).subscribe({
        next: (photos) => {
          this.galleryPhotos.set(photos);
          this.imageLoadStates = new Array(photos.length).fill(false);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Error cargando galería:', error);
          this.toast.error('Error al cargar las fotos de la galería');
          this.isLoading.set(false);
        },
      });
    } catch (error) {
      console.error('Error en loadGalleryPhotos:', error);
      this.isLoading.set(false);
    }
  }

  // ========================
  // MANEJO DE IMÁGENES
  // ========================

  onImageLoad(index: number) {
    this.imageLoadStates[index] = true;
    this.cdr.detectChanges();
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const file = target.files[0];

    // Validación de tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.toast.error('Por favor, selecciona una imagen JPG, PNG o WebP.');
      return;
    }

    // Validación de tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.toast.error('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    // Validar orientación horizontal
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (img.width < img.height) {
        this.toast.error('Por favor, usa una imagen horizontal (apaisada).');
        URL.revokeObjectURL(url);
        return;
      }

      // Si pasa las validaciones, guardamos el file y la preview
      this.selectedFile = file;

      if (this.imagePreviewUrl) {
        URL.revokeObjectURL(this.imagePreviewUrl);
      }
      this.imagePreviewUrl = URL.createObjectURL(file);

      URL.revokeObjectURL(url);
    };

    img.onerror = () => {
      this.toast.error('No se pudo cargar la imagen.');
      URL.revokeObjectURL(url);
    };

    img.src = url;
  }

  // ========================
  // SUBIR IMAGEN
  // ========================

  async uploadImage() {
    if (!this.selectedFile) {
      this.toast.error('Por favor, selecciona una imagen primero.');
      return;
    }

    const fileName = this.selectedFile.name.replace(
      /\.(jpe?g|png|webp)$/i,
      '.webp'
    );
    const photoEntity = new GalleryPhoto(fileName, '', PhotoType.GALLERY);

    try {
      this.isLoading.set(true);
      this.progress.set('0%');

      await this.uploadPhotoUseCase.execute(this.selectedFile, photoEntity);

      this.toast.success('Foto subida con éxito');

      // Limpiar estado
      this.selectedFile = null;
      if (this.imagePreviewUrl) {
        URL.revokeObjectURL(this.imagePreviewUrl);
        this.imagePreviewUrl = '';
      }

      await this.loadGalleryPhotos();
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      this.toast.error('Error al subir la imagen');
    } finally {
      this.isLoading.set(false);
      this.progress.set('0%');
    }
  }

  // ========================
  // ELIMINAR IMAGEN
  // ========================

  async deleteImage(index: number) {
    const confirmed = await this.toast.confirm(
      '¿Estás seguro de que deseas eliminar esta imagen?'
    );

    if (!confirmed) return;

    const photo = this.galleryPhotos()[index];

    try {
      // ✅ USAR EL USE CASE PARA ELIMINAR
      await this.deletePhotoUseCase.execute(photo);

      // Actualizar estado local
      this.galleryPhotos.update((photos) =>
        photos.filter((_, i) => i !== index)
      );

      this.toast.success('Foto eliminada con éxito');
    } catch (error) {
      console.error('Error eliminando foto:', error);
      this.toast.error('Error al eliminar la foto');
    }
  }

  // ========================
  // ACTUALIZAR NOMBRE (Opcional - si tienes un use case para esto)
  // ========================

  async updateImage(index: number) {
    const photo = this.galleryPhotos()[index];

    let newName = await this.toast.prompt(
      'Introduzca un nuevo nombre para la imagen'
    );

    if (newName === null) {
      this.toast.error('Por favor, ingrese un nombre para la imagen');
      return;
    }

    if (newName === false) return;

    // Agregar extensión original
    const extension = photo.name.split('.').pop();
    newName = `${newName}.${extension}`;

    // TODO: Si tienes un UpdatePhotoUseCase, úsalo aquí
    // Por ahora, actualizamos solo localmente
    this.galleryPhotos.update((photos) => {
      const updated = [...photos];
      updated[index] = new GalleryPhoto(
        newName,
        photo.id,
        photo.url,
        photo.imageLoaded,
        photo.type
      );
      return updated;
    });

    this.toast.success('Nombre actualizado');
  }
}
