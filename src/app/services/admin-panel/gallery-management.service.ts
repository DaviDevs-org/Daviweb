import { inject, Injectable } from "@angular/core";
import { ListResult, Storage, StorageReference, deleteObject, getDownloadURL, getMetadata, listAll, ref, uploadBytesResumable, updateMetadata} from '@angular/fire/storage';
import { GalleryPhoto } from "../../admin-panel/types/admin.types";


@Injectable({
    providedIn:'root'
})
export class GalleryService{
    private storage = inject(Storage)
    
    uploadImage(file: File){
        const id = crypto.randomUUID();
        const path = `pruebas/${id}`
        const storageRef = ref(this.storage, path)

        try{
            const response = uploadBytesResumable(storageRef, file, {customMetadata:{originalName: file.name, date: file.lastModified.toString()}})
            return response
        }
        catch (error){
            alert(error)
            return undefined
        }
    }

    async getUrl(ref:StorageReference){
        return await getDownloadURL(ref)
    }

    async getImageInfo(list:ListResult){
        const images:GalleryPhoto[] = []
        for (const image of list.items) {
            const metadata = await getMetadata(image)
            const url = await this.getUrl(image)
            const i = new GalleryPhoto(
                metadata.customMetadata!["originalName"],
                url,
                metadata.customMetadata!["date"],
                image.name
            );
            images.push(i)
        }
        return images
    }
    async getImages(){
        const reference = ref(this.storage, 'pruebas');
        const images = await listAll(reference);
        return images
    }
    async deleteImage(id:string){
        const reference = ref(this.storage, `pruebas/${id}`)
        const response = await deleteObject(reference)
        return response
    }
    async updateImage(id:string, name:string){
        const reference = ref(this.storage, `pruebas/${id}`)
        const metadata = await getMetadata(reference)
        const newMetadata = {
        ...metadata,       
        customMetadata: {
            ...metadata.customMetadata, 
            originalName: name        
            }
        };
        const response = await updateMetadata(reference, newMetadata)
        return response
    }
}