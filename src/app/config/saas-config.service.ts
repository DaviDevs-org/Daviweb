import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TenantService } from './tenant.service';
import { TenantConfig } from '../domain/saas/tenant.config';

@Injectable({
  providedIn: 'root'
})
export class SaasConfigService {
  
  constructor(
    @Inject(DOCUMENT) private document: Document,
    private tenantService: TenantService
  ) {
    // APP_INITIALIZER garantiza que TenantService ya tiene la config cargada
    // antes de que se instancie cualquier servicio o componente.
    // Si getTenantConfig() lanza aquí es un fallo crítico de bootstrapping,
    // no lo silenciamos: debe propagarse para que sea detectable.
    
    // Desactivamos la inicialización dinámica del tema para guiarnos por los SCSS
    // this.initializeTheme();
  }

  private get config(): TenantConfig {
    return this.tenantService.getTenantConfig();
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
   * Inicializa las variables CSS basadas en la configuración inyectando un
   * <style id="tenant-theme"> en el <head>.
   * Al ejecutarse también en SSR, Angular Universal serializa ese nodo en el
   * HTML estático enviado al navegador → el primer paint ya tiene los colores
   * correctos → sin FOUC.
   */
  private initializeTheme(): void {
    const css = this.buildThemeCss(this.config.theme);

    const styleId = 'tenant-theme';
    let styleEl = this.document.getElementById(styleId) as HTMLStyleElement | null;

    if (!styleEl) {
      styleEl = this.document.createElement('style');
      styleEl.id = styleId;
      this.document.head.appendChild(styleEl);
    }

    styleEl.textContent = css;
  }

  private buildThemeCss(theme: TenantConfig['theme']): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(theme.colors)) {
      const cssVarName = `--color-${this.camelToKebab(key)}`;
      parts.push(`${cssVarName}:${value as string}`);

      const rgb = this.hexToRgb(value as string);
      if (rgb) {
        parts.push(`${cssVarName}-rgb:${rgb}`);
      }
    }

    parts.push(`--font-main:${theme.fonts.main}`);
    parts.push(`--font-headings:${theme.fonts.headings}`);

    return `:root{${parts.join(';')}}`;
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
