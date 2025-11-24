import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import {
    ListResult,
    Storage,
    StorageReference,
    deleteObject,
    getDownloadURL,
    listAll,
    ref,
    uploadBytesResumable,
    UploadTask
} from '@angular/fire/storage';
import { GalleryRepository } from '@application/gallery';
import { GalleryPhoto, PhotoType } from '@domain/index';
import { Observable, from } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FirebaseGalleryRepository implements GalleryRepository {
    private storage = inject(Storage);
    private injector = inject(Injector);

    private galleryPath = 'pruebas/data/gallery/photos';

    getPhotos(type: PhotoType): Observable<GalleryPhoto[]> {
        return runInInjectionContext(this.injector, () => {
            const galleryRef = ref(this.storage, `${this.galleryPath}/${type}`);
            const loadPhotos = async (): Promise<GalleryPhoto[]> => {
                const res: ListResult = await listAll(galleryRef);
                const photos: GalleryPhoto[] = [];

                for (const itemRef of res.items) {
                    const url = await getDownloadURL(itemRef);
                    photos.push(new GalleryPhoto(itemRef.name, url, type));
                }

                return photos;
            };
            // Convertimos la promesa en Observable (emite una vez y completa)
            return from(loadPhotos());
        });
    }
    uploadPhoto(file: File, photo:GalleryPhoto): UploadTask {
        const photoRef: StorageReference = ref(this.storage, `${this.galleryPath}/${photo.type}/${photo.id}`);
        const fileRef: StorageReference = ref(photoRef, photo.name);
        
        const metadata = {
            contentType: file.type
        };
        return uploadBytesResumable(fileRef, file, metadata);
    }

    async deletePhoto(id: string, type: PhotoType): Promise<void> {
        const photoRef: StorageReference = ref(this.storage, `${this.galleryPath}/${type}/${id}`);
        await deleteObject(photoRef);
    }

}