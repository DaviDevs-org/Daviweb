/**
 * Value Object: Email
 * 
 * Representa un email válido en el dominio.
 * Es inmutable y se valida automáticamente.
 */
export class Email {
  private readonly value: string;

  constructor(email: string) {
    this.value = this.validate(email);
  }

  private validate(email: string): string {
    const trimmed = email.trim().toLowerCase();
    
    if (!trimmed) {
      throw new Error('El email no puede estar vacío');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error(`Email inválido: ${email}`);
    }

    return trimmed;
  }

  /**
   * Obtiene el valor del email
   */
  getValue(): string {
    return this.value;
  }

  /**
   * Obtiene el dominio del email (@example.com)
   */
  getDomain(): string {
    return this.value.split('@')[1];
  }

  /**
   * Obtiene la parte local del email (antes del @)
   */
  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  /**
   * Genera un enlace mailto
   */
  toMailtoLink(subject?: string, body?: string): string {
    let link = `mailto:${this.value}`;
    const params: string[] = [];
    
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    
    if (params.length > 0) {
      link += '?' + params.join('&');
    }
    
    return link;
  }

  /**
   * Verifica si dos emails son iguales
   */
  equals(other: Email): boolean {
    return this.value === other.value;
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
