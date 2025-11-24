import { Observable } from 'rxjs';
import { GalleryPhoto, PhotoType } from '@domain/index';
import { UploadTask } from '@angular/fire/storage';

export abstract class GalleryRepository {
  abstract getPhotos(type: PhotoType): Observable<GalleryPhoto[]>;
  abstract uploadPhoto(file: File, photo:GalleryPhoto): UploadTask; // returns photo ID
  abstract deletePhoto(id: string, type: PhotoType): Promise<void>;
}
