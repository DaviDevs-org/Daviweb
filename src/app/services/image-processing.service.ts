/*! Totalmente implementado en @application/gallery


import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
}

@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  private platformId = inject(PLATFORM_ID);

  private async loadImage(file: File): Promise<HTMLImageElement> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Image processing is only available in the browser');
    }
    const dataUrl = await this.readAsDataURL(file);
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  private readAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Recorta a 16:9 centrado y redimensiona a un maxWidth (manteniendo 16:9), exporta WebP
  async processForCarousel(file: File, options?: { maxWidth?: number; quality?: number }): Promise<ProcessResult> {
    const maxWidth = options?.maxWidth ?? 1600;
    const quality = options?.quality ?? 0.82;

    const img = await this.loadImage(file);
    // Calcular recorte centrado a 16:9
    const targetRatio = 16 / 9;
    const imgRatio = img.width / img.height;

    let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
    if (imgRatio > targetRatio) {
      // Imagen más ancha: recortar en ancho
      sWidth = Math.floor(img.height * targetRatio);
      sx = Math.floor((img.width - sWidth) / 2);
    } else if (imgRatio < targetRatio) {
      // Imagen más alta: recortar en alto
      sHeight = Math.floor(img.width / targetRatio);
      sy = Math.floor((img.height - sHeight) / 2);
    }

    const outWidth = Math.min(maxWidth, sWidth);
    const outHeight = Math.floor(outWidth / targetRatio);

    const canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context available');
    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outWidth, outHeight);

    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/webp', quality));
    return { blob, width: outWidth, height: outHeight };
  }

  // Redimensiona manteniendo proporción a un ancho máximo, exporta WebP
  async processGeneric(file: File, options?: { maxWidth?: number; maxHeight?: number; quality?: number }): Promise<ProcessResult> {
    const maxWidth = options?.maxWidth ?? 1024;
    const maxHeight = options?.maxHeight ?? 1024;
    const quality = options?.quality ?? 0.84;

    const img = await this.loadImage(file);

    // Calcular tamaño de salida manteniendo proporción
    let outW = img.width;
    let outH = img.height;

    const widthRatio = maxWidth / outW;
    const heightRatio = maxHeight / outH;
    const ratio = Math.min(1, widthRatio, heightRatio);

    outW = Math.floor(outW * ratio);
    outH = Math.floor(outH * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context available');
    ctx.drawImage(img, 0, 0, outW, outH);

    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/webp', quality));
    return { blob, width: outW, height: outH };
  }
}
*/