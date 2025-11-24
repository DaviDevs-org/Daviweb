import { Injectable } from '@angular/core';
import { BusinessInfoRepository } from '../business-info.repository.interface';

@Injectable({
  providedIn: 'root'
})
export class DeleteExceptionUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  async execute(id: string): Promise<void> {
    return this.businessInfoRepository.deleteException(id);
  }
}
