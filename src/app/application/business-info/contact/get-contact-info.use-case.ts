import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BusinessInfoRepository } from '../business-info.repository.interface';
import { ContactInfo } from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class GetContactInfoUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(): Observable<ContactInfo> {
    return this.businessInfoRepository.getContactInfo();
  }
}
