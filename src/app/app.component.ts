import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { SaasConfigService } from './config/saas-config.service';

@Component({
  selector: 'app-root',
  imports: 
  [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private saasConfig = inject(SaasConfigService);
  private titleService = inject(Title);

  ngOnInit() {
    // Establecer el título globalmente desde la configuración
    const businessName = this.saasConfig.getAll().business.name;
    this.titleService.setTitle(businessName);
  }
}
