import { Injectable } from '@angular/core';
import { GalleryRepository } from './gallery.repository.interface';
import { GalleryPhoto } from '@domain/gallery';

@Injectable({
  providedIn: 'root'
})
export class DeletePhotoUseCase {
  constructor(private readonly galleryRepository: GalleryRepository) {}

  execute(photo: GalleryPhoto): Promise<void> {
    // Validación: ID requerido
    if (!photo.id || photo.id.trim().length === 0) {
      throw new Error('El ID de la foto es requerido');
    }

    return this.galleryRepository.deletePhoto(photo.id, photo.type);
  }
}
