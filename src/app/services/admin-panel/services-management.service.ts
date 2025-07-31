import { inject, Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, deleteDoc, doc, updateDoc, getDocs} from '@angular/fire/firestore';
import {Service} from '../../admin-panel/types/admin.types';
import { Observable } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class ServiceManager{
    private firestore = inject(Firestore)
    private path = '/pruebas/data/services';


    getServices():Observable<Service[]>{
        const placeRef = collection(this.firestore, this.path)
        return collectionData(placeRef, {idField: 'id'}) as Observable<Service[]>
    }
    async getServicesDirectly(): Promise<Service[]> {
        const placeRef = collection(this.firestore, this.path);
        const snapshot = await getDocs(placeRef);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Service[];
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