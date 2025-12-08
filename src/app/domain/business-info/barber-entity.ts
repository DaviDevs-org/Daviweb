export interface BarberDTO {
  id?: string; // Original ID (usually the name)
  name: string;
  imageUrl?: string;
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
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  toDTO(): BarberDTO {
    const tdo: BarberDTO = {
      name: this.name
    };

    if (this.id) {
      tdo.id = this.id;
    }

    if (this.imageUrl) {
      tdo.imageUrl = this.imageUrl;
    }

    return tdo;
  }

  static fromDTO(tdo: BarberDTO): Barber {
    return new Barber(tdo.name, tdo.imageUrl, tdo.id);
  }
}

export class BarberSettings {
  constructor(
    public barberSelection: boolean,
    public barbers: Barber[]
  ) {}

  isEnabled(): boolean {
    return this.barberSelection;
  }

  hasBarbersAvailable(): boolean {
    return this.barbers.length > 0;
  }

  /**
   * Obtiene un barbero por su nombre
   */
  getBarberByName(name: string): Barber | undefined {
    return this.barbers.find(barber =>
      barber.name.toLowerCase() === name.toLowerCase()
    );
  }

  toggleSelection(): void {
    this.barberSelection = !this.barberSelection;
  }

  getBarberNames(): string[] {
    return this.barbers.map(b => b.name);
  }

  toDTO(): BarberSettingsDTO {
    return {
      barberSelection: this.barberSelection,
      barbers: this.barbers.map(barber => barber.toDTO())
    };
  }

  static fromDTO(tdo: BarberSettingsDTO): BarberSettings {
    const barbers = tdo.barbers.map(b => Barber.fromDTO(b));
    return new BarberSettings(tdo.barberSelection, barbers);
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
    super(name, imageUrl);
  }
}