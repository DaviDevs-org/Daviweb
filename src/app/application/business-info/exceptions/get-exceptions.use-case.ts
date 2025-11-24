import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BusinessInfoRepository } from '../business-info.repository.interface';
import { ExceptionItem } from '@domain/index';

@Injectable({
  providedIn: 'root'
})
export class GetExceptionsUseCase {
  constructor(private readonly businessInfoRepository: BusinessInfoRepository) {}

  execute(): Observable<ExceptionItem[]> {
    return this.businessInfoRepository.getExceptions();
  }
}
