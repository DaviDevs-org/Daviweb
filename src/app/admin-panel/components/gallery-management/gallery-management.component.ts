// gallery-management.component.ts
import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface GalleryPhoto {
  id: string;
  url: string;
  title: string;
  uploadDate: Date;
}

@Component({
  selector: 'app-gallery-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl:"./gallery-management.component.html",
  styleUrls: ['./gallery-management.component.scss']
})
export class GalleryManagementComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;

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

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecciona un archivo de imagen válido.');
        return;
      }

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

  getGalleryStats(): { total: number, recent: number } {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      total: this.galleryPhotos.length,
      recent: this.galleryPhotos.filter(photo => photo.uploadDate > thirtyDaysAgo).length
    };
  }
}