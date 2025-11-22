import { Observable } from 'rxjs';

export interface GalleryPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
  description?: string;
}

export abstract class GalleryRepository {
  abstract getPhotos(): Observable<GalleryPhoto[]>;
  abstract getPhotoById(id: string): Observable<GalleryPhoto | null>;
  abstract uploadPhoto(file: File, description?: string): Promise<string>; // returns photo ID
  abstract deletePhoto(id: string): Promise<void>;
}
