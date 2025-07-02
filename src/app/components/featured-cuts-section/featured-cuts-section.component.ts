// src/app/components/featured-cuts-section/featured-cuts-section.component.ts
import { Component } from '@angular/core';

interface Cut {
  image: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-featured-cuts-section',
  templateUrl: './featured-cuts-section.component.html',
})
export class FeaturedCutsSectionComponent {
  cuts: Cut[] = [
    {
      image: 'assets/featured/low-fade.jpg',
      title: 'Low Fade',
      description: 'El clásico corte degradado con acabado texturizado.',
    },
    {
      image: 'assets/featured/beard-trim-fade.jpg',
      title: 'Beard Trim + Fade',
      description: 'Recorte de barba y degradado limpio.',
    },
    {
      image: 'assets/featured/scissor-cut.jpg',
      title: 'Corte con Tijera',
      description: 'Corte a tijera para acabado más natural.',
    },
    {
      image: 'assets/featured/classic-cut.jpg',
      title: 'Corte Clásico',
      description: 'Corte tradicional con líneas definidas.',
    },
    {
      image: 'assets/featured/undercut.jpg',
      title: 'Undercut',
      description: 'Laterales muy cortos con parte superior larga.',
    },
    {
      image: 'assets/featured/texturized-cut.jpg',
      title: 'Corte Texturizado',
      description: 'Capas y textura para un look desenfadado.',
    },
  ];
}
