import { Injectable } from '@angular/core';
import { GalleryRepository } from './gallery.repository.interface';
import { ProcessResult, PhotoType, GalleryPhoto } from '@domain/index';
import { UploadTask } from '@angular/fire/storage';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadPhotoUseCase {
  constructor(private readonly galleryRepository: GalleryRepository) {}

  async execute(file: File, photo:GalleryPhoto): Promise<UploadTask> {
    // Validación: archivo requerido
    if (!file) {
      throw new Error('El archivo es requerido');
    }

    // Validación: nombre requerido
    if (!photo.name || photo.name.trim().length === 0) {
      throw new Error('El nombre de la foto es requerido');
    }

    // Validación: debe ser una imagen
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    // Validación: tamaño máximo (ej: 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new Error('El archivo no puede superar los 5MB');
    }

    if (Object.values(PhotoType).indexOf(photo.type) === -1) {
      throw new Error('Tipo de foto inválido');
    }
    else if (photo.type == PhotoType.GALLERY) {
      // Procesar imagen para galería (16:9, maxWidth 1600)
      const processed = await this.processForCarousel(file, { maxWidth: 1600 });
      file = new File([processed.blob], file.name, { type: 'image/webp', lastModified: file.lastModified });
    }
    else {
      // Procesar imagen genérica (max 1024x1024)
      const processed = await this.processGeneric(file, { maxWidth: 1024, maxHeight: 1024 });
      file = new File([processed.blob], file.name, { type: 'image/webp', lastModified: file.lastModified });
    }
    return this.galleryRepository.uploadPhoto(file, photo);
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
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
