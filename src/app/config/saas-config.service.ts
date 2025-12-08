import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SAAS_CONFIG, SaasConfig } from './saas.config';

@Injectable({
  providedIn: 'root'
})
export class SaasConfigService {
  private readonly config: SaasConfig = SAAS_CONFIG;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.initializeTheme();
  }

  /**
   * Obtiene la configuración completa
   */
  getAll() {
    return this.config;
  }

  getDDBBPaths(){
    return this.config.database.collections;
  }
  getDDBBStoragePaths(){
    return this.config.database.storage;
  }
  /**
   * Inicializa las variables CSS basadas en la configuración
   * Esto permite cambiar los colores desde saas.config.ts sin tocar SCSS
   */
  private initializeTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const root = document.documentElement;
    const colors = this.config.theme.colors;

    // Asignar variables CSS
    this.setColors(root, colors);

    // Fuentes
    root.style.setProperty('--font-main', this.config.theme.fonts.main);
    root.style.setProperty('--font-headings', this.config.theme.fonts.headings);
  }

  private setColors(root: HTMLElement, colors: any): void {
    for (const [key, value] of Object.entries(colors)) {
      const cssVarName = `--color-${this.camelToKebab(key)}`;
      root.style.setProperty(cssVarName, value as string);

      // Generar versión RGB para transparencias
      const rgb = this.hexToRgb(value as string);
      if (rgb) {
        root.style.setProperty(`${cssVarName}-rgb`, rgb);
      }
    }
  }

  private camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  private hexToRgb(hex: string): string | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
      null;
  }
}
