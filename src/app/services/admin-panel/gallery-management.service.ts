// src/app/services/gallery-management.service.ts
import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
  ListResult,
  Storage,
  StorageReference,
  deleteObject,
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytesResumable,
  updateMetadata
} from '@angular/fire/storage';
import { GalleryPhoto } from '../../admin-panel/types/admin.types';
import { AlertService } from '../alert/alert.service';

@Injectable({
  providedIn: 'root'
})
export class GalleryService {
  private injector = inject(Injector);
  private storage = inject(Storage);
  private toast = inject(AlertService)

  uploadImage(file: File) {
    const id = crypto.randomUUID();
    const path = `pruebas/${id}`;
    const storageRef = ref(this.storage, path);

    try {
      return runInInjectionContext(this.injector, () =>
        uploadBytesResumable(storageRef, file, {
          customMetadata: {
            originalName: file.name,
            date: file.lastModified.toString()
          }
        })
      );
    } catch (error) {
      this.toast.error("Error al subir la imagen, vuelva a intentarlo o póngase en contacto con los desarrolladores.");
      return undefined;
    }
  }
  uploadServiceImage(file: File) {
    const id = crypto.randomUUID();
    const path = `pruebas/services/${id}`;
    const storageRef = ref(this.storage, path);

    try {
      // uploadBytesResumable devuelve un UploadTask inmediatamente
      return runInInjectionContext(this.injector, () =>
        uploadBytesResumable(storageRef, file, {
          customMetadata: {
            originalName: file.name,
            date: file.lastModified.toString()
          }
        })
      );
    } catch (error) {
      this.toast.error("Error al subir la imagen, vuelva a intentarlo o póngase en contacto con los desarrolladores.");
      return undefined;
    }
  }
  uploadBarberImage(file: File) {
    const id = crypto.randomUUID();
    const path = `pruebas/barbers/${id}`;
    const storageRef = ref(this.storage, path);

    try {
      // uploadBytesResumable devuelve un UploadTask inmediatamente
      return runInInjectionContext(this.injector, () =>
        uploadBytesResumable(storageRef, file, {
          customMetadata: {
            originalName: file.name,
            date: file.lastModified.toString()
          }
        })
      );
    } catch (error) {
      this.toast.error("Error al subir la imagen, vuelva a intentarlo o póngase en contacto con los desarrolladores.");
      return undefined;
    }
  }
  /**
   * Obtener URL (si se usa fuera de runInInjectionContext, la envolvemos)
   */
  async getUrl(storageRef: StorageReference): Promise<string> {
    return runInInjectionContext(this.injector, () => getDownloadURL(storageRef));
  }

  /**
   * A partir de listAll(ListResult) construye las GalleryPhoto con metadata + url
   * (envuelto en runInInjectionContext para que getMetadata/getDownloadURL no
   * protesten).
   */
  async getImageInfo(list: ListResult): Promise<GalleryPhoto[]> {
    return runInInjectionContext(this.injector, async () => {
      const images: GalleryPhoto[] = [];

      // Procesar en paralelo pero de forma controlada
      const promises = list.items.map(async (imageRef) => {
        try {
          // Usar Promise.all para ejecutar ambas operaciones en paralelo
          const [metadata, url] = await Promise.all([
            getMetadata(imageRef),
            getDownloadURL(imageRef)
          ]);

          const originalName = metadata.customMetadata?.['originalName'] ?? 'Sin nombre';
          const date = metadata.customMetadata?.['date'] ?? '';

          return new GalleryPhoto(originalName, url, date, imageRef.name);
        } catch (error) {
          console.error('Error processing image:', imageRef.name, error);
          return null;
        }
      });

      const results = await Promise.all(promises);
      return results.filter((photo): photo is GalleryPhoto => photo !== null);
    });
  }

  /**
   * listAll debe ejecutarse también dentro del context
   */
  async getImages(): Promise<ListResult> {
    return runInInjectionContext(this.injector, async () => {
      const reference = ref(this.storage, 'pruebas');
      return await listAll(reference);
    });
  }

  async deleteImage(id: string): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const reference = ref(this.storage, `pruebas/${id}`);
      await deleteObject(reference);
    });
  }

  async updateImage(id: string, name: string): Promise<void> {
    return runInInjectionContext(this.injector, async () => {
      const reference = ref(this.storage, `pruebas/${id}`);
      const metadata = await getMetadata(reference);
      const newMetadata = {
        contentType: metadata.contentType,
        customMetadata: {
          ...metadata.customMetadata,
          originalName: name
        }
      };
      await updateMetadata(reference, newMetadata);
    });
  }
}
