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
                
                const photosPromises = res.items.map(async (itemRef) => {
                    try {
                        const [url, metadata] = await Promise.all([
                            getDownloadURL(itemRef),
                            getMetadata(itemRef)
                        ]);
                        
                        const name = metadata.customMetadata?.['name'] || itemRef.name;
                        const id = itemRef.name;
                        
                        return new GalleryPhoto(name, id, url, true, type);
                    } catch (error) {
                        console.error(`Error loading photo ${itemRef.name}:`, error);
                        return null;
                    }
                });

                const photos = (await Promise.all(photosPromises)).filter((p): p is GalleryPhoto => p !== null);
                return photos;
            };
            return from(loadPhotos());
        });
    }

    uploadPhoto(file: File, photo: GalleryPhoto): UploadTask {
        const fileRef: StorageReference = ref(this.storage, `${this.galleryPath}/${photo.type}/${photo.id}`);
        
        const metadata = {
            contentType: file.type,
            customMetadata: {
                name: photo.name
            }
        };
        return uploadBytesResumable(fileRef, file, metadata);
    }

    deletePhoto(id: string, type: PhotoType): Promise<void> {
        return runInInjectionContext(this.injector, async () => {
            const photoRef: StorageReference = ref(this.storage, `${this.galleryPath}/${type}/${id}`);
            await deleteObject(photoRef);
        });
    }

}