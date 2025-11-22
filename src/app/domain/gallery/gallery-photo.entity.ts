import { GalleryPhotoDTO } from './gallery-photo.types';
export class GalleryPhoto {
  constructor(
    public name: string,
    public url: string,
    public id?: string,
    public imageLoaded: boolean = false
  ) {
    this.validateName();
    this.name = this.getSanitizedName();
  }

  private validateName(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('El nombre de la foto no puede estar vacío');
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
