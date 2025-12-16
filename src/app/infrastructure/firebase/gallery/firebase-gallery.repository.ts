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

  async renamePhoto(
    photo: GalleryPhoto,
    newName: string
  ): Promise<GalleryPhoto> {
    return await runInInjectionContext(this.injector, async () => {
      // 1. Construir paths antiguo y nuevo
      const oldPath = `${this.galleryPath}/${photo.type}/${photo.id}`;
      const extension = photo.id.split('.').pop() || 'webp';
      const sanitized = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const newFileName = `${sanitized}.${extension}`;
      const newPath = `${this.galleryPath}/${photo.type}/${newFileName}`;

      const oldRef = ref(this.storage, oldPath);
      const newRef = ref(this.storage, newPath);

      // 2. Descargar el blob del antiguo fichero
      const url = await getDownloadURL(oldRef);
      const response = await fetch(url);
      const blob = await response.blob();

      // 3. Subir el blob al nuevo path con el mismo metadata
      const metadata = { customMetadata: { name: newName } };
      await uploadBytesResumable(newRef, blob, metadata);

      // 4. Borrar el antiguo fichero
      await deleteObject(oldRef);

      // 5. Devolver nuevo GalleryPhoto (id = nuevo nombre de fichero)
      // IMPORTANTE: Pasamos 'newName' (el input del usuario) como nombre, no el nombre del fichero.
      // La entidad GalleryPhoto se encargará de sanitizarlo internamente, pero al menos
      // no le pegamos la extensión del fichero (.webp) al nombre visible.
      return new GalleryPhoto(
        newName,
        newFileName,
        await getDownloadURL(newRef),
        true,
        photo.type
      );
    });
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
