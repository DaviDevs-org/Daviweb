import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ScrollService {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  scrollToSection(sectionId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      // Si el elemento no existe aún (raro si está en el DOM principal), 
      // podríamos intentar un pequeño retry o loguear.
      // Con @defer, el contenedor debería existir siempre.
      console.warn(`Element with id ${sectionId} not found`);
    }
  }
}
