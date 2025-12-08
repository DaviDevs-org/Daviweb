import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SaasConfigService } from './config/saas-config.service';

@Component({
  selector: 'app-root',
  imports: 
  [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'daviweb';

  constructor(private saasConfig: SaasConfigService) {
    // El servicio inicializa el tema automáticamente en su constructor
  }
}
