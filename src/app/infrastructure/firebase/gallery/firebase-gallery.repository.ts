import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
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
    UploadTask
} from '@angular/fire/storage';
import { GalleryRepository } from '@application/gallery';
import { GalleryPhoto, PhotoType } from '@domain/index';
import { from, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SaasConfigService } from 'src/app/config/saas-config.service';

@Injectable({
    providedIn: 'root'
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
        const galleryRef = ref(this.storage, `${this.galleryPath}/${type}`);
        
        const loadPhotos = async (): Promise<GalleryPhoto[]> => {
            try {
                const res: ListResult = await runInInjectionContext(this.injector, () => listAll(galleryRef));
                
                const photosPromises = res.items.map(async (itemRef) => {
                    return runInInjectionContext(this.injector, async () => {
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
                });

                const photos = (await Promise.all(photosPromises)).filter((p): p is GalleryPhoto => p !== null);
                return photos;
            } catch (error) {
                console.error('Error listing photos:', error);
                return [];
            }
        };

        return from(loadPhotos()).pipe(
            catchError(err => {
                console.error('Error in getPhotos observable:', err);
                return of([]);
            })
        );
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

    async deletePhoto(id: string, type: PhotoType): Promise<void> {
        const photoRef: StorageReference = ref(this.storage, `${this.galleryPath}/${type}/${id}`);
        await deleteObject(photoRef);
    }
}
