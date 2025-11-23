import { Observable } from 'rxjs';
import { GalleryPhoto, PhotoType } from '@domain/index';
import { UploadTask } from '@angular/fire/storage';

export abstract class GalleryRepository {
  abstract getPhotos(): Observable<GalleryPhoto[]>;
  abstract uploadPhoto(file: File, name: string, type: PhotoType): Promise<UploadTask>; // returns photo ID
  abstract deletePhoto(id: string): Promise<void>;
}
