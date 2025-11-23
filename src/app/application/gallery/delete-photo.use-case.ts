import { Injectable } from '@angular/core';
import { GalleryRepository } from './gallery.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class DeletePhotoUseCase {
  constructor(private readonly galleryRepository: GalleryRepository) {}

  async execute(id: string): Promise<void> {
    // Validación: ID requerido
    if (!id || id.trim().length === 0) {
      throw new Error('El ID de la foto es requerido');
    }

    return this.galleryRepository.deletePhoto(id);
  }
}
