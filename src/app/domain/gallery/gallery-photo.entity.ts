import { GalleryPhotoDTO } from './gallery-photo.types';

export enum PhotoType {
  GALLERY = 'gallery',
  SERVICE = 'service',
  BARBER = 'barber'
}

export interface ProcessResult {
  blob: Blob;
  width: number;
  height: number;
}
export class GalleryPhoto {
  constructor(
    public name: string,
    public id: string,
    public url?: string,
    public imageLoaded: boolean = false,
    public type: PhotoType = PhotoType.GALLERY
  ) {
    this.id = crypto.randomUUID();
    this.validateName();
    this.name = this.getSanitizedName();
    this.validateType();
  }

  private validateName(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('El nombre de la foto no puede estar vacío');
    }
  }

  private validateType(): void {
    if (!Object.values(PhotoType).includes(this.type)) {
      throw new Error('El tipo de la foto no es válido');
    }
  }

  get displayName(): string {
    // 1. Si tiene extensión con punto, la quitamos (case-insensitive explícito)
    let clean = this.name.replace(/\.[^/.]+$/i, "");
    
    // 2. Si es un slug con extensión al final (ej: -webp, -JPG), la quitamos
    clean = clean.replace(/-(webp|jpg|jpeg|png|gif|bmp|tiff|heic)$/i, '');
    
    // 3. Reemplazamos guiones, guiones bajos Y PUNTOS restantes por espacios
    clean = clean.replace(/[-_.]+/g, ' ');
    
    // 4. Capitalizamos la primera letra de cada palabra
    return clean.trim().replace(/\b\w/g, l => l.toUpperCase());
  }

  isLoaded(): boolean {
    return this.imageLoaded;
  }

  toggleLoaded(): void {
    this.imageLoaded = !this.imageLoaded;
  }

  getSanitizedName(): string {
    return this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  toDTO(): GalleryPhotoDTO {
    return {
      name: this.name,
      url: this.url!,
      lastModified: new Date()
    };
  }

  static fromDTO(dto: GalleryPhotoDTO, id?: string): GalleryPhoto {
    return new GalleryPhoto(dto.name, dto.url, id);
  }
}
