/**
 * Value Object: Phone
 * 
 * Representa un número de teléfono válido en el dominio.
 * Es inmutable y se valida automáticamente.
 */
export class Phone {
  private readonly value: string;
  private readonly cleaned: string;

  constructor(phone: string) {
    this.cleaned = this.clean(phone);
    this.value = this.validate(this.cleaned);
  }

  /**
   * Limpia el teléfono de caracteres no numéricos (excepto +)
   */
  private clean(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Valida el formato del teléfono
   */
  private validate(phone: string): string {
    if (!phone) {
      throw new Error('El teléfono no puede estar vacío');
    }

    // Validación más estricta según prefijo
    const hasPrefix = phone.startsWith('+');
    
    if (hasPrefix) {
      // Con prefijo: +[1-3 dígitos país][9-12 dígitos número] -> Total 11-16 caracteres aprox
      // Ejemplo: +34 600 000 000 (12 chars)
      const prefixRegex = /^\+\d{11,15}$/;
      if (!prefixRegex.test(phone)) {
        throw new Error(`Teléfono con prefijo inválido (debe tener entre 11 y 15 dígitos): ${phone}`);
      }
    } else {
      // Sin prefijo: asume nacional (España 9 dígitos)
      const nationalRegex = /^\d{9}$/;
      if (!nationalRegex.test(phone)) {
        throw new Error(`Teléfono nacional inválido (debe tener 9 dígitos): ${phone}`);
      }
    }

    return phone;
  }

  /**
   * Obtiene el valor del teléfono
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Obtiene el teléfono limpio (sin formato)
   */
  getCleaned(): string {
    return this.cleaned;
  }

  /**
   * Formatea el teléfono para España (+34 XXX XX XX XX)
   */
  formatSpanish(): string {
    if (this.value.startsWith('+34')) {
      const number = this.value.substring(3);
      if (number.length === 9) {
        return `+34 ${number.substring(0, 3)} ${number.substring(3, 5)} ${number.substring(5, 7)} ${number.substring(7)}`;
      }
    }
    return this.value;
  }

  /**
   * Verifica si es un teléfono móvil español
   */
  isSpanishMobile(): boolean {
    return this.value.startsWith('+346') || this.value.startsWith('+347');
  }

  /**
   * Genera un enlace tel: para llamadas
   */
  toTelLink(): string {
    return `tel:${this.cleaned}`;
  }

  /**
   * Genera un enlace de WhatsApp
   */
  toWhatsAppLink(message?: string): string {
    const number = this.cleaned.startsWith('+') 
      ? this.cleaned.substring(1) 
      : this.cleaned;
    
    let link = `https://wa.me/${number}`;
    
    if (message) {
      link += `?text=${encodeURIComponent(message)}`;
    }
    
    return link;
  }

  /**
   * Verifica si dos teléfonos son iguales
   */
  equals(other: Phone): boolean {
    return this.cleaned === other.cleaned;
  }

  /**
   * Representación en string
   */
  toString(): string {
    return this.value;
  }

  /**
   * Para serialización JSON
   */
  toJSON(): string {
    return this.value;
  }
}
