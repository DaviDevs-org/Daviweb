import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { GalleryService } from '../services/admin-panel/gallery-management.service';
import { GalleryPhoto } from '../admin-panel/types/admin.types';

interface CarouselItem {
  image: string;
  caption: string;
  alt: string;
}

@Component({
  selector: 'app-photo-of-the-day',
  templateUrl: './photo-of-the-day.component.html',
  styleUrls: ['./photo-of-the-day.component.scss'],
  imports: [CommonModule, NgOptimizedImage]
})
export class PhotoOfTheDayComponent implements OnInit, OnDestroy {
  private galleryService = inject(GalleryService);
  
  carouselItems = signal<CarouselItem[]>([]);
  currentSlide = signal(0);
  totalSlides = signal(0);
  isLoading = signal(true);
  
  private intervalId?: number;

  async ngOnInit() {
    await this.loadGalleryImages();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async loadGalleryImages() {
    try {
      this.isLoading.set(true);
      
      // Obtener las imágenes del storage
      const imagesList = await this.galleryService.getImages();
      const galleryPhotos = await this.galleryService.getImageInfo(imagesList);
      
      // Convertir las fotos de la galería a elementos del carrusel
      const items: CarouselItem[] = galleryPhotos.map(photo => ({
        image: photo.url,
        caption: this.formatCaption(photo.name),
        alt: photo.name
      }));
      
      this.carouselItems.set(items);
      this.totalSlides.set(items.length);
      
      // Solo iniciar autoplay si hay imágenes
      if (items.length > 1) {
        this.startAutoPlay();
      }
      
    } catch (error) {
      console.error('Error loading gallery images:', error);
      // Fallback con imágenes por defecto si hay error
      this.loadFallbackImages();
    } finally {
      this.isLoading.set(false);
    }
  }

  private loadFallbackImages() {
    const fallbackItems: CarouselItem[] = [
      {
        image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        caption: 'Corte clásico fade – Cliente: Pedro L.',
        alt: 'Corte clásico fade'
      },
      {
        image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        caption: 'Afeitado con navaja – Cliente: Marco S.',
        alt: 'Afeitado con navaja'
      },
      {
        image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        caption: 'Corte texturizado – Cliente: Antonio G.',
        alt: 'Corte texturizado'
      },
      {
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        caption: 'Estilo vintage – Cliente: Raúl M.',
        alt: 'Estilo vintage'
      }
    ];
    
    this.carouselItems.set(fallbackItems);
    this.totalSlides.set(fallbackItems.length);
    this.startAutoPlay();
  }

  private formatCaption(filename: string): string {
    // Remover la extensión del archivo
    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
    
    // Capitalizar la primera letra y reemplazar guiones/underscore por espacios
    const formatted = nameWithoutExtension
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    return formatted;
  }

  private startAutoPlay() {
    // Solo iniciar autoplay si hay más de una imagen
    if (this.totalSlides() <= 1) return;
    
    this.intervalId = window.setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  private stopAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  goToSlide(index: number) {
    if (this.totalSlides() === 0) return;
    
    this.currentSlide.set(index);
    this.stopAutoPlay();
    
    // Reiniciar autoplay solo si hay múltiples imágenes
    if (this.totalSlides() > 1) {
      this.startAutoPlay();
    }
  }

  nextSlide() {
    if (this.totalSlides() <= 1) return;
    
    const current = this.currentSlide();
    const total = this.totalSlides();
    this.currentSlide.set((current + 1) % total);
  }

  prevSlide() {
    if (this.totalSlides() <= 1) return;
    
    const current = this.currentSlide();
    const total = this.totalSlides();
    this.currentSlide.set(current === 0 ? total - 1 : current - 1);
  }

  pauseAutoPlay() {
    this.stopAutoPlay();
  }

  resumeAutoPlay() {
    if (!this.intervalId && this.totalSlides() > 1) {
      this.startAutoPlay();
    }
  }

  // Método para actualizar las imágenes (útil si se llama desde el admin)
  async refreshGallery() {
    await this.loadGalleryImages();
  }
}