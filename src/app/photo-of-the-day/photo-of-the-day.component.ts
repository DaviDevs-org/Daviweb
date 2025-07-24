import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';

interface CarouselItem {
  image: string;
  caption: string;
  alt: string;
}

@Component({
  selector: 'app-photo-of-the-day',
  templateUrl: './photo-of-the-day.component.html',
  styleUrls: ['./photo-of-the-day.component.scss'],
  imports:[CommonModule]
})
export class PhotoOfTheDayComponent implements OnInit, OnDestroy {
  
  carouselItems: CarouselItem[] = [
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

  currentSlide = 0;
  private intervalId?: number;

  ngOnInit() {
    this.startAutoPlay();
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  private startAutoPlay() {
    this.intervalId = window.setInterval(() => {
      this.nextSlide();
    }, 5000); 
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.startAutoPlay();
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.carouselItems.length;
  }

  prevSlide() {
    this.currentSlide = this.currentSlide === 0 
      ? this.carouselItems.length - 1 
      : this.currentSlide - 1;
  }

  
  pauseAutoPlay() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  
  resumeAutoPlay() {
    if (!this.intervalId) {
      this.startAutoPlay();
    }
  }
}