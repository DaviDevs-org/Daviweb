import { Injectable } from '@angular/core';
import { BusinessInfoRepository } from '../business-info.repository.interface';
import { ContactInfo } from '@domain/business-info';

@Injectable({
  providedIn: 'root'
})
export class UpdateContactInfoUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  async execute(contactInfo: ContactInfo): Promise<void> {
    // Las validaciones de phone, email y address ya se hacen en el constructor de ContactInfo
    // Si llegamos aquí, el objeto ya está validado

    return this.businessInfoRepository.updateContactInfo(contactInfo);
  }
}
