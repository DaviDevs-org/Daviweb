// rename-photo.use-case.ts
import { Injectable } from '@angular/core';
import { GalleryPhoto } from '@domain/index';

@Injectable({ providedIn: 'root' })
export class RenamePhotoUseCase {
  execute(photo: GalleryPhoto, newName: string): GalleryPhoto {
    return new GalleryPhoto(
      newName,
      photo.id,
      photo.url,
      photo.imageLoaded,
      photo.type
    );
  }
}
