import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GalleryRepository } from './gallery.repository.interface';
import { GalleryPhoto, PhotoType } from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class GetPhotosUseCase {
  constructor(private readonly galleryRepository: GalleryRepository) {}

  execute(type: PhotoType): Observable<GalleryPhoto[]> {
    return this.galleryRepository.getPhotos(type);
  }
}
