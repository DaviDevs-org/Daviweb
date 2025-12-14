import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BusinessStateService } from '@presentation/shared/business-state.service';

@Component({
  selector: 'app-legal-advice',
  imports: [RouterLink],
  templateUrl: './legal-advice.component.html',
  styleUrl: './legal-advice.component.scss'
})
export class LegalAdviceComponent {
  public state = inject(BusinessStateService)
}
