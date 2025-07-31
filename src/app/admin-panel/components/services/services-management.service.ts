import { inject, Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, deleteDoc, doc, updateDoc} from '@angular/fire/firestore';
import {Service} from '../../types/admin.types';
import { Observable } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class ServiceManager{
    private firestore = inject(Firestore)
    private path = 'pruebas/data/services';


    getServices():Observable<Service[]>{
        const placeRef = collection(this.firestore, this.path)
        return collectionData(placeRef, {idField: 'id'}) as Observable<Service[]>
    }
    addService(s:Service){
        const placeRef = collection(this.firestore, this.path);
        return addDoc(placeRef, s.toJson())
    }
    deleteService(id:string){
        const placeRef = doc(this.firestore, this.path + '/' + id)
        return deleteDoc(placeRef)
    }
    updateService(id:string, s:Service){
        const placeRef = doc(this.firestore, this.path + '/' + id)
        return updateDoc(placeRef, s.toJson())
    }
}