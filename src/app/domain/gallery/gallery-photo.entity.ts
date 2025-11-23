import { GalleryPhotoDTO } from './gallery-photo.types';

export enum PhotoType {
  GALLERY = 'gallery',
  SERVICE = 'service',
  BARBER = 'barber'
}
export class GalleryPhoto {
  constructor(
    public name: string,
    public url: string,
    public id?: string,
    public imageLoaded: boolean = false,
    public type: PhotoType = PhotoType.GALLERY
  ) {
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
      url: this.url,
      lastModified: new Date()
    };
  }

  static fromDTO(dto: GalleryPhotoDTO, id?: string): GalleryPhoto {
    return new GalleryPhoto(dto.name, dto.url, id);
  }
}
