// src/app/components/carousel-section/carousel-section.component.ts
import { Component } from '@angular/core';

interface Slide {
  image: string;
  caption: string;
}

@Component({
  selector: 'app-carousel-section',
  templateUrl: './carousel-section.component.html',
})
export class CarouselSectionComponent {
  slides: Slide[] = [
    { image: 'assets/cortes/dia1.jpg', caption: 'Corte clásico fade – Cliente: Pedro L.' },
    { image: 'assets/cortes/dia2.jpg', caption: 'Corte undercut – Cliente: María S.' },
    { image: 'assets/cortes/dia3.jpg', caption: 'Beard trim + fade – Cliente: Jose R.' },
    { image: 'assets/cortes/dia4.jpg', caption: 'Corte texturizado – Cliente: Luis M.' },
  ];
  currentIndex = 0;

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.slides.length) % this.slides.length;
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.slides.length;
  }
}
