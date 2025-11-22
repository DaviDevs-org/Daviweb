export interface BarberTDO {
  name: string;
  photoUrl?: string;
}

export interface BarberSettingsTDO {
  barberSelection: boolean;
  barbers: BarberTDO[];
}

export class Barber {
  constructor(
    public name: string,
    public photoUrl?: string
  ) {
    this.validateName();
  }

  private validateName(): void {
    if (!this.name || this.name.trim().length === 0) {
      throw new Error('El nombre del barbero no puede estar vacío');
    }
  }

  hasPhoto(): boolean {
    return !!this.photoUrl && this.photoUrl.trim().length > 0;
  }

  getInitials(): string {
    return this.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  toTDO(): BarberTDO {
    const tdo: BarberTDO = {
      name: this.name
    };

    if (this.photoUrl) {
      tdo.photoUrl = this.photoUrl;
    }

    return tdo;
  }

  static fromTDO(tdo: BarberTDO): Barber {
    return new Barber(tdo.name, tdo.photoUrl);
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

  toTDO(): BarberSettingsTDO {
    return {
      barberSelection: this.barberSelection,
      barbers: this.barbers.map(barber => barber.toTDO())
    };
  }

  static fromTDO(tdo: BarberSettingsTDO): BarberSettings {
    const barbers = tdo.barbers.map(b => Barber.fromTDO(b));
    return new BarberSettings(tdo.barberSelection, barbers);
  }
}