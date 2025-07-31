// services-management.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth, onAuthStateChanged, user } from '@angular/fire/auth';
import { ServiceManager } from '../services/services-management.service';
import {Service} from '../../types/admin.types'


interface NewService {
  name: string;
  price: number;
  description: string;
}

@Component({
  selector: 'app-services-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./services-management.component.html",
  styleUrls: ['./services-management.component.scss']
})
export class ServicesManagementComponent {
  private auth = inject(Auth)
  private service = inject(ServiceManager)

  services: Service[] = [];
  ngOnInit(){
    onAuthStateChanged(this.auth, user=> {
      if (user) {
        user.getIdToken().then(token => {
          this.service.getServices().subscribe(service => {
            this.services = service
          })
        })
      }
    })
  }
  newService: NewService = {
    name: '',
    price: 0,
    description: ''
  };

  async addService(){
    if (!this.newService.name.trim()) {
      alert('Por favor, ingresa el nombre del servicio.');
      return;
    }

    if (this.newService.price <= 0) {
      alert('Por favor, ingresa un precio válido.');
      return;
    }

    const serviceNew = new Service(this.newService.name, this.newService.description, true, this.newService.price)

    const response = await this.service.addService(serviceNew)
    console.log(response)

    this.newService = {
      name: '',
      price: 0,
      description: ''
    };

    alert('Servicio añadido correctamente!');
  }

  async editService(index: number){
    const serviceU = this.services[index];
    
    const newName = prompt('Nuevo nombre del servicio:', serviceU.name);
    if (newName === null) return;

    const newPriceStr = prompt('Nuevo precio (€):', serviceU.price.toString());
    if (newPriceStr === null) return;

    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Por favor, ingresa un precio válido.');
      return;
    }

    const newDescription = prompt('Nueva descripción:', serviceU.description);
    if (newDescription === null) return;

    const response = await this.service.updateService(serviceU.id!, new Service(newName, newDescription, true, newPrice))

    alert('Servicio actualizado correctamente!');
  }

  async deleteService(index: number){
    const service = this.services[index];
    
    if (confirm(`¿Estás seguro de que quieres eliminar "${service.name}"?`)) {
      const response = await this.service.deleteService(service.id!)
      alert(`El servicio ${service.name} ha sido borrado con éxito`)
    }
  }
}