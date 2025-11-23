import { Phone, Email } from "@domain";

export interface ContactInfoDTO {
  phone: string;
  email: string;
  address: string;
}

export class ContactInfo {
  phone: Phone;
  email: Email;
  constructor(
    phone: string,
    email: string,
    public address: string
  ) {
    this.phone = new Phone(phone);
    this.email = new Email(email);
    if (this.address.trim().length === 0) {
      throw new Error('La dirección no puede estar vacía');
    }
  }

  getPhoneLink(): string {
    return this.phone.toTelLink()
  }

  getEmailLink(): string {
    return this.email.toMailtoLink();
  }

  getGoogleMapsLink(): string {
    const encodedAddress = encodeURIComponent(this.address);
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }

  toDTO(): ContactInfoDTO {
    return {
      phone: this.phone.toString(),
      email: this.email.toString(),
      address: this.address
    };
  }

  static fromDTO(tdo: ContactInfoDTO): ContactInfo {
    return new ContactInfo(tdo.phone, tdo.email, tdo.address);
  }
}
