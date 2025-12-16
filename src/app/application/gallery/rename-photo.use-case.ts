// rename-photo.use-case.ts
import { Injectable } from '@angular/core';
import { GalleryPhoto } from '@domain/index';
import { GalleryRepository } from './gallery.repository.interface';

@Injectable({ providedIn: 'root' })
export class RenamePhotoUseCase {
  constructor(private readonly galleryRepository: GalleryRepository) {}

  async execute(photo: GalleryPhoto, newName: string): Promise<GalleryPhoto> {
    return this.galleryRepository.renamePhoto(photo, newName);
  }
}
