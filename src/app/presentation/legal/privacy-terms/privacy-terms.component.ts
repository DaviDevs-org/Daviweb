import { Component, inject } from '@angular/core';
import { BusinessStateService } from '@presentation/shared/business-state.service';

@Component({
  selector: 'app-privacy-terms',
  imports: [],
  templateUrl: './privacy-terms.component.html',
  styleUrl: './privacy-terms.component.scss'
})
export class PrivacyTermsComponent {
  public state = inject(BusinessStateService);
}
