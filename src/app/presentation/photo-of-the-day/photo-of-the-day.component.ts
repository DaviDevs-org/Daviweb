import {
  CommonModule,
  isPlatformBrowser,
  NgOptimizedImage,
} from '@angular/common';
import {
  Component,
  OnDestroy,
  inject,
  signal,
  PLATFORM_ID,
  NgZone,
} from '@angular/core';
import { effect } from '@angular/core';
import { GalleryPhoto, PhotoType } from '../../domain';
import { BusinessStateService } from '@presentation/shared/business-state.service';

@Component({
  selector: 'app-photo-of-the-day',
  templateUrl: './photo-of-the-day.component.html',
  styleUrls: ['./photo-of-the-day.component.scss'],
  imports: [CommonModule, NgOptimizedImage],
})
export class PhotoOfTheDayComponent implements OnDestroy {
  private businessState = inject(BusinessStateService);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  carouselItems = signal<GalleryPhoto[]>([]);
  currentSlide = signal(0);
  totalSlides = signal(0);
  isLoading = signal(true);

  private intervalId?: number;

  private readonly photosEffect = effect(() => {
    const photos = this.businessState.galleryImages(); // señal del state
    if (photos.length === 0) {
      this.isLoading.set(true);
      return;
    }

    const items = photos.filter((p) => p.type === PhotoType.GALLERY && !!p.url);

    if (!items.length) {
      // fallback si no hay fotos reales
      this.loadFallbackImages();
      this.isLoading.set(false);
      return;
    }

    this.carouselItems.set(items);
    this.totalSlides.set(items.length);
    this.isLoading.set(false);

    if (items.length > 1 && isPlatformBrowser(this.platformId)) {
      this.startAutoPlay();
    } else {
      this.stopAutoPlay();
    }
  });

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private loadFallbackImages() {
    const fallbackItems: GalleryPhoto[] = [
      new GalleryPhoto(
        'Corte clásico fade – Cliente: Pedro L.',
        'fallback-1',
        'https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        true,
        PhotoType.GALLERY
      ),
      new GalleryPhoto(
        'Afeitado con navaja – Cliente: Marco S.',
        'fallback-2',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        true,
        PhotoType.GALLERY
      ),
      new GalleryPhoto(
        'Corte texturizado – Cliente: Antonio G.',
        'fallback-3',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        true,
        PhotoType.GALLERY
      ),
      new GalleryPhoto(
        'Estilo vintage – Cliente: Raúl M.',
        'fallback-4',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=755&h=500&q=80',
        true,
        PhotoType.GALLERY
      ),
    ];

    this.carouselItems.set(fallbackItems);
    this.totalSlides.set(fallbackItems.length);
    this.startAutoPlay();
  }

  formatCaption(filename: string): string {
    // Remover la extensión del archivo
    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');

    // Capitalizar la primera letra y reemplazar guiones/underscore por espacios
    const formatted = nameWithoutExtension
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    return formatted;
  }

  getAltText(filename: string): string {
    const baseName = this.formatCaption(filename);
    return `${baseName} realizado en peluquería moderna en Madrid | RO'S PELUQUEROS`;
  }

  onProgressInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.goToSlide(Number(input.value));
  }

  private startAutoPlay() {
    // Solo iniciar autoplay si hay más de una imagen
    if (this.totalSlides() <= 1) return;
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        this.intervalId = window.setInterval(() => {
          this.ngZone.run(() => {
            this.nextSlide();
          });
        }, 8000);
      });
    }
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
    this.stopAutoPlay();

    // Reiniciar autoplay solo si hay múltiples imágenes
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

    // Reiniciar autoplay solo si hay múltiples imágenes
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
}
