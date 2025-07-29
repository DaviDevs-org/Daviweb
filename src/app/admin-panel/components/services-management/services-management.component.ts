// services-management.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Service {
  id: string;
  name: string;
  price: number;
  description: string;
  active: boolean;
}

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
  services: Service[] = [
    {
      id: '1',
      name: 'Corte de Pelo Masculino',
      price: 25,
      description: 'Corte profesional con acabado moderno y personalizado',
      active: true
    },
    {
      id: '2',
      name: 'Corte de Pelo Femenino',
      price: 35,
      description: 'Corte y peinado adaptado a tu estilo personal',
      active: true
    },
    {
      id: '3',
      name: 'Arreglo de Barba',
      price: 15,
      description: 'Perfilado y arreglo profesional de barba',
      active: true
    },
    {
      id: '4',
      name: 'Coloración',
      price: 45,
      description: 'Tinte y coloración con productos premium',
      active: true
    },
    {
      id: '5',
      name: 'Peinado para Eventos',
      price: 40,
      description: 'Peinado especial para bodas, comuniones y eventos',
      active: true
    }
  ];

  newService: NewService = {
    name: '',
    price: 0,
    description: ''
  };

  addService(): void {
    if (!this.newService.name.trim()) {
      alert('Por favor, ingresa el nombre del servicio.');
      return;
    }

    if (this.newService.price <= 0) {
      alert('Por favor, ingresa un precio válido.');
      return;
    }

    const service: Service = {
      id: Date.now().toString(),
      name: this.newService.name.trim(),
      price: this.newService.price,
      description: this.newService.description.trim(),
      active: true
    };

    this.services.unshift(service);

    this.newService = {
      name: '',
      price: 0,
      description: ''
    };

    alert('Servicio añadido correctamente!');
  }

  editService(index: number): void {
    const service = this.services[index];
    
    const newName = prompt('Nuevo nombre del servicio:', service.name);
    if (newName === null) return;

    const newPriceStr = prompt('Nuevo precio (€):', service.price.toString());
    if (newPriceStr === null) return;

    const newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice <= 0) {
      alert('Por favor, ingresa un precio válido.');
      return;
    }

    const newDescription = prompt('Nueva descripción:', service.description);
    if (newDescription === null) return;

    service.name = newName.trim();
    service.price = newPrice;
    service.description = newDescription.trim();

    alert('Servicio actualizado correctamente!');
  }

  deleteService(index: number): void {
    const service = this.services[index];
    
    if (confirm(`¿Estás seguro de que quieres eliminar "${service.name}"?`)) {
      this.services.splice(index, 1);
    }
  }

  getActiveServices(): Service[] {
    return this.services.filter(service => service.active);
  }

  getTotalServices(): number {
    return this.services.length;
  }

  getAveragePrice(): number {
    if (this.services.length === 0) return 0;
    const total = this.services.reduce((sum, service) => sum + service.price, 0);
    return total / this.services.length;
  }

  formatPrice(price: number): string {
    return price.toFixed(2);
  }
}