import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GalleryRepository } from './gallery.repository.interface';
import { GalleryPhoto } from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class GetPhotosUseCase {
  constructor(private readonly galleryRepository: GalleryRepository) {}

  execute(): Observable<GalleryPhoto[]> {
    return this.galleryRepository.getPhotos();
  }
}
