import {
  inject,
  Injectable,
  Injector,
  runInInjectionContext,
} from '@angular/core';
import {
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ListResult,
  ref,
  Storage,
  StorageReference,
  uploadBytesResumable,
  UploadTask,
} from '@angular/fire/storage';
import { GalleryRepository } from '@application/gallery';
import { GalleryPhoto, PhotoType } from '@domain/index';
import { from, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SaasConfigService } from 'src/app/config/saas-config.service';

@Injectable({
  providedIn: 'root',
})
export class FirebaseGalleryRepository implements GalleryRepository {
  private storage = inject(Storage);
  private injector = inject(Injector);
  private pathConfig = inject(SaasConfigService).getDDBBStoragePaths();

  private galleryPath = this.pathConfig.general;

  getPhotos(type: PhotoType): Observable<GalleryPhoto[]> {
    if (!this.storage) {
      console.error('Firebase Storage is not initialized!');
      return of([]);
    }

    const loadPhotos = async (): Promise<GalleryPhoto[]> =>
      await runInInjectionContext(this.injector, async () => {
        try {
          const galleryRef = await runInInjectionContext(this.injector, () =>
            ref(this.storage, `${this.galleryPath}/${type}`)
          );

          const res: ListResult = await runInInjectionContext(
            this.injector,
            () => listAll(galleryRef)
          );

          const photos = await Promise.all(
            res.items.map(async (itemRef) => {
              try {
                const url = await runInInjectionContext(this.injector, () =>
                  getDownloadURL(itemRef)
                );

                const metadata = await runInInjectionContext(
                  this.injector,
                  () => getMetadata(itemRef)
                );

                const name = metadata.customMetadata?.['name'] || itemRef.name;
                const id = itemRef.name;

                return new GalleryPhoto(name, id, url, true, type);
              } catch (e) {
                console.error(`Error loading photo ${itemRef.name}:`, e);
                return null;
              }
            })
          );

          return photos.filter((p): p is GalleryPhoto => p !== null);
        } catch (e) {
          console.error('Error listing photos:', e);
          return [];
        }
      });

    return from(loadPhotos()).pipe(catchError(() => of([])));
  }

  uploadPhoto(file: File, photo: GalleryPhoto): UploadTask {
    return runInInjectionContext(this.injector, () => {
      const fileRef: StorageReference = ref(
        this.storage,
        `${this.galleryPath}/${photo.type}/${photo.id}`
      );

      const metadata = {
        contentType: file.type,
        customMetadata: {
          name: photo.name,
        },
      };
      return uploadBytesResumable(fileRef, file, metadata);
    });
  }

  async deletePhoto(id: string, type: PhotoType): Promise<void> {
    return await runInInjectionContext(this.injector, async () => {
      const photoRef: StorageReference = ref(
        this.storage,
        `${this.galleryPath}/${type}/${id}`
      );
      await deleteObject(photoRef);
    });
  }
}
