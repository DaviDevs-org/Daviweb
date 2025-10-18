import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal, Inject, PLATFORM_ID } from '@angular/core';
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
  imports: [CommonModule]
})
export class PhotoOfTheDayComponent implements OnInit, OnDestroy {
  private galleryService = inject(GalleryService);
  carouselItems = signal<CarouselItem[]>([]);
  currentSlide = signal(0);
  totalSlides = signal(0);
  isLoading = signal(true);
  private intervalId?: number;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  async ngOnInit() {
    await this.loadGalleryImages();
  }

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId) && this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private async loadGalleryImages() {
    try {
      this.isLoading.set(true);
      // SOLO EN SSR limitamos el número de imágenes
      const imagesList = await this.galleryService.getImages(isPlatformBrowser(this.platformId) ? undefined : 4);

      const galleryPhotos = await this.galleryService.getImageInfo(imagesList);
      const items: CarouselItem[] = galleryPhotos.map(photo => {
        const baseName = this.formatCaption(photo.name);
        return {
          image: photo.url,
          caption: baseName,
          alt: `${baseName} realizado en peluquería moderna en Madrid | RO'S PELUQUEROS`
        };
      });
      this.carouselItems.set(items);
      this.totalSlides.set(items.length);
      if (items.length > 1) {
        this.startAutoPlay();
      }
    } catch (error) {
      console.error('Error loading gallery images:', error);
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
        alt: "Corte clásico fade realizado en peluquería moderna en Madrid | RO'S PELUQUEROS"
      },
      {
        image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        caption: 'Afeitado con navaja – Cliente: Marco S.',
        alt: "Afeitado con navaja realizado en peluquería moderna en Madrid | RO'S PELUQUEROS"
      },
      {
        image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        caption: 'Corte texturizado – Cliente: Antonio G.',
        alt: "Corte texturizado realizado en peluquería moderna en Madrid | RO'S PELUQUEROS"
      },
      {
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        caption: 'Estilo vintage – Cliente: Raúl M.',
        alt: "Estilo vintage realizado en peluquería moderna en Madrid | RO'S PELUQUEROS"
      }
    ];
    this.carouselItems.set(fallbackItems);
    this.totalSlides.set(fallbackItems.length);
    this.startAutoPlay();
  }

  private formatCaption(filename: string): string {
    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
    const formatted = nameWithoutExtension
      .replace(/[\-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    return formatted;
  }

  onProgressInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.goToSlide(Number(input.value));
  }

  private startAutoPlay() {
    if (this.totalSlides() <= 1) return;
    if (isPlatformBrowser(this.platformId)) {
      this.intervalId = window.setInterval(() => {
        this.nextSlide();
      }, 8000);
    }
  }

  private stopAutoPlay() {
    if (isPlatformBrowser(this.platformId) && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  goToSlide(index: number) {
    if (this.totalSlides() === 0) return;
    this.currentSlide.set(index);
    this.stopAutoPlay();
    if (this.totalSlides() > 1) {
      this.startAutoPlay();
    }
  }

  nextSlide() {
    if (this.totalSlides() <= 1) return;
    const current = this.currentSlide();
    const total = this.totalSlides();
    this.currentSlide.set((current + 1) % total);
    this.stopAutoPlay();
    if (this.totalSlides() > 1) {
      this.startAutoPlay();
    }
  }

  prevSlide() {
    if (this.totalSlides() <= 1) return;
    const current = this.currentSlide();
    const total = this.totalSlides();
    this.currentSlide.set(current === 0 ? total - 1 : current - 1);
    this.stopAutoPlay();
    if (this.totalSlides() > 1) {
      this.startAutoPlay();
    }
  }

  pauseAutoPlay() {
    this.stopAutoPlay();
  }

  resumeAutoPlay() {
    if (!this.intervalId && this.totalSlides() > 1) {
      this.startAutoPlay();
    }
  }

  async refreshGallery() {
    await this.loadGalleryImages();
  }
}
