export interface BarberDTO {
  id?: string; // Original ID (usually the name)
  name: string;
  imageUrl?: string;
  imagePath?: string;
}

export interface BarberSettingsDTO {
  barberSelection: boolean;
  barbers: BarberDTO[];
}
// Interfaz extendida para mostrar información adicional del peluquero

export class Barber {
  constructor(
    public name: string,
    public imageUrl?: string,
    public imagePath?: string,
    public id?: string
  ) {
    this.validateName();
  }

  private validateName(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('El nombre del barbero no puede estar vacío');
    }
  }

  hasPhoto(): boolean {
    return !!this.imageUrl && this.imageUrl.trim().length > 0;
  }

  getInitials(): string {
    return this.name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  toDTO(): BarberDTO {
    const dto: BarberDTO = {
      name: this.name,
    };

    if (this.id) {
      dto.id = this.id;
    }

    if (this.imageUrl) {
      dto.imageUrl = this.imageUrl;
    }

    if (this.imagePath) {
      dto.imagePath = this.imagePath;
    }

    return dto;
  }

  static fromDTO(dto: BarberDTO): Barber {
    return new Barber(dto.name, dto.imageUrl, dto.imagePath, dto.id);
  }
}

export class BarberSettings {
  constructor(public barberSelection: boolean, public barbers: Barber[]) {}

  isEnabled(): boolean {
    return this.barberSelection;
  }

  hasBarbersAvailable(): boolean {
    return this.barbers.length > 0;
  }

  getBarberByName(name: string): Barber | undefined {
    return this.barbers.find(
      (barber) => barber.name.toLowerCase() === name.toLowerCase()
    );
  }

  toggleSelection(): void {
    this.barberSelection = !this.barberSelection;
  }

  getBarberNames(): string[] {
    return this.barbers.map((b) => b.name);
  }

  toDTO(): BarberSettingsDTO {
    return {
      barberSelection: this.barberSelection,
      barbers: this.barbers.map((barber) => barber.toDTO()),
    };
  }

  static fromDTO(dto: BarberSettingsDTO): BarberSettings {
    const barbers = dto.barbers.map((b) => Barber.fromDTO(b));
    return new BarberSettings(dto.barberSelection, barbers);
  }
}

export class BarberDisplay extends Barber {
  constructor(
    name: string,
    imageUrl?: string,
    public featured?: boolean,
    public specialty?: string,
    public experience?: number,
    public description?: string
  ) {
    // imagePath e id opcionales, no los usas aquí
    super(name, imageUrl);
  }
}
