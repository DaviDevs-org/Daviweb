import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GalleryPhoto {
  id: string;
  url: string;
  title: string;
  uploadDate: Date;
}

interface Service {
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

interface ScheduleDay {
  name: string;
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

interface ContactInfo {
  phone: string;
  email: string;
  address: string;
}

interface Statistics {
  monthlyClients: number;
  monthlyRevenue: number;
  averageRating: number;
  weeklyAppointments: number;
}

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Estado de la pestaña activa
  activeTab: string = 'gallery';

  // Archivo seleccionado para subir
  selectedFile: File | null = null;

  // Datos de la galería
  galleryPhotos: GalleryPhoto[] = [
    {
      id: '1',
      url: 'assets/images/gallery/corte1.jpg',
      title: 'Corte Moderno Masculino',
      uploadDate: new Date('2024-01-15')
    },
    {
      id: '2',
      url: 'assets/images/gallery/peinado1.jpg',
      title: 'Peinado Elegante Femenino',
      uploadDate: new Date('2024-01-20')
    },
    {
      id: '3',
      url: 'assets/images/gallery/barba1.jpg',
      title: 'Arreglo de Barba Profesional',
      uploadDate: new Date('2024-01-25')
    }
  ];

  // Servicios actuales
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

  // Nuevo servicio (formulario)
  newService: NewService = {
    name: '',
    price: 0,
    description: ''
  };

  // Horarios de la peluquería
  schedule: ScheduleDay[] = [
    { name: 'Lunes', day: 'monday', open: '09:00', close: '19:00', closed: false },
    { name: 'Martes', day: 'tuesday', open: '09:00', close: '19:00', closed: false },
    { name: 'Miércoles', day: 'wednesday', open: '09:00', close: '19:00', closed: false },
    { name: 'Jueves', day: 'thursday', open: '09:00', close: '19:00', closed: false },
    { name: 'Viernes', day: 'friday', open: '09:00', close: '20:00', closed: false },
    { name: 'Sábado', day: 'saturday', open: '09:00', close: '18:00', closed: false },
    { name: 'Domingo', day: 'sunday', open: '10:00', close: '14:00', closed: true }
  ];

  // Información de contacto
  contactInfo: ContactInfo = {
    phone: '+34 123 456 789',
    email: 'info@peluqueriamoderna.com',
    address: 'Calle Principal, 123\n28001 Madrid, España'
  };

  // Estadísticas
  stats: Statistics = {
    monthlyClients: 287,
    monthlyRevenue: 8450,
    averageRating: 4.8,
    weeklyAppointments: 68
  };

  constructor() {}

  // Métodos para cambiar de pestaña
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Métodos para la galería
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona un archivo de imagen válido.');
        return;
      }

      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 5MB.');
        return;
      }

      this.selectedFile = file;
    }
  }

  uploadImage(): void {
    if (!this.selectedFile) {
      alert('Por favor, selecciona una imagen primero.');
      return;
    }

    // Simular subida de archivo
    const reader = new FileReader();
    reader.onload = (e) => {
      const newPhoto: GalleryPhoto = {
        id: Date.now().toString(),
        url: e.target?.result as string,
        title: 'Nueva imagen',
        uploadDate: new Date()
      };
      
      this.galleryPhotos.unshift(newPhoto);
      this.selectedFile = null;
      
      // Limpiar input file
      if (this.fileInput) {
        this.fileInput.nativeElement.value = '';
      }
      
      alert('Imagen subida correctamente!');
    };
    
    reader.readAsDataURL(this.selectedFile);
  }

  editPhoto(index: number): void {
    const photo = this.galleryPhotos[index];
    const newTitle = prompt('Nuevo título para la imagen:', photo.title);
    
    if (newTitle !== null && newTitle.trim() !== '') {
      photo.title = newTitle.trim();
    }
  }

  deletePhoto(index: number): void {
    const photo = this.galleryPhotos[index];
    
    if (confirm(`¿Estás seguro de que quieres eliminar "${photo.title}"?`)) {
      this.galleryPhotos.splice(index, 1);
    }
  }

  // Métodos para servicios
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

    // Limpiar formulario
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

  // Métodos para información general
  saveSchedule(): void {
    // Validar horarios
    for (const day of this.schedule) {
      if (!day.closed) {
        if (!day.open || !day.close) {
          alert(`Por favor, completa los horarios para ${day.name}.`);
          return;
        }

        if (day.open >= day.close) {
          alert(`La hora de apertura debe ser anterior a la de cierre para ${day.name}.`);
          return;
        }
      }
    }

    // Simular guardado
    setTimeout(() => {
      alert('Horarios guardados correctamente!');
    }, 500);
  }

  saveContactInfo(): void {
    if (!this.contactInfo.phone.trim()) {
      alert('Por favor, ingresa un número de teléfono.');
      return;
    }

    if (!this.contactInfo.email.trim()) {
      alert('Por favor, ingresa un email.');
      return;
    }

    if (!this.contactInfo.address.trim()) {
      alert('Por favor, ingresa una dirección.');
      return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.contactInfo.email)) {
      alert('Por favor, ingresa un email válido.');
      return;
    }

    // Simular guardado
    setTimeout(() => {
      alert('Información de contacto guardada correctamente!');
    }, 500);
  }

  // Método para cerrar sesión
  logout(): void {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      // Aquí iría la lógica para cerrar sesión
      // Por ejemplo, limpiar localStorage, redirigir, etc.
      alert('Sesión cerrada correctamente.');
      // Simular redirección
      console.log('Redirigiendo al login...');
    }
  }

  // Método para obtener el color de cambio de estadísticas
  getChangeClass(change: string): string {
    if (change.includes('+')) return 'positive';
    if (change.includes('-')) return 'negative';
    return 'neutral';
  }

  // Método para formatear números
  formatNumber(num: number): string {
    return num.toLocaleString('es-ES');
  }

  // Método para formatear precios
  formatPrice(price: number): string {
    return price.toFixed(2);
  }

  // Método para obtener la fecha formateada
  formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Método para obtener el estado del día
  getDayStatus(day: ScheduleDay): string {
    if (day.closed) return 'Cerrado';
    return `${day.open} - ${day.close}`;
  }

  // Método para validar horarios en tiempo real
  validateTime(day: ScheduleDay): void {
    if (!day.closed && day.open && day.close && day.open >= day.close) {
      alert(`La hora de apertura debe ser anterior a la de cierre para ${day.name}.`);
      day.close = '';
    }
  }

  // Método para obtener servicios activos
  getActiveServices(): Service[] {
    return this.services.filter(service => service.active);
  }

  // Método para obtener el total de servicios
  getTotalServices(): number {
    return this.services.length;
  }

  // Método para obtener el precio promedio
  getAveragePrice(): number {
    if (this.services.length === 0) return 0;
    const total = this.services.reduce((sum, service) => sum + service.price, 0);
    return total / this.services.length;
  }

  // Método para obtener estadísticas de la galería
  getGalleryStats(): { total: number, recent: number } {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      total: this.galleryPhotos.length,
      recent: this.galleryPhotos.filter(photo => photo.uploadDate > thirtyDaysAgo).length
    };
  }
}