import { Component, inject } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { AboutUsComponent } from '../about-us/about-us.component';
import { LocationAndContactComponent } from '../location-and-contact/location-and-contact.component';
import { OpinionsComponent } from '../opinions/opinions.component';
import { AppointmentComponent } from '../appointment/appointment.component';
import { FaqComponent } from '../faq/faq.component';
import { FooterComponent } from '../footer/footer.component';
import { PhotoOfTheDayComponent } from '../photo-of-the-day/photo-of-the-day.component';
import { ServicesInfoComponent } from '../services-info/services-info.component';
import { BarbersInfoComponent } from '../barbers-info/barbers-info.component';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  imports: [HeaderComponent, AboutUsComponent, LocationAndContactComponent,
  OpinionsComponent, FaqComponent, FooterComponent, PhotoOfTheDayComponent,
  ServicesInfoComponent, AppointmentComponent, BarbersInfoComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  private title = inject(Title);
  private meta = inject(Meta);

  ngOnInit() {
    this.title.setTitle('Peluquería - Reserva tu cita online | Nombre Peluquería');
    
    // SEO básico
    this.meta.updateTag({ name: 'description', content: 'Reserva cita en nuestra peluquería. Los mejores profesionales a tu servicio.' });
    this.meta.updateTag({ name: 'keywords', content: 'peluquería, cita online, barbería, corte de pelo, estilismo' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ name: 'author', content: 'Nombre Peluquería' });
    this.meta.updateTag({ charset: 'UTF-8' });
    this.meta.updateTag({ name: 'viewport', content: 'width=device-width, initial-scale=1' });
    
    // Canonical URL
    this.meta.updateTag({ rel: 'canonical', href: 'https://tudominio.com' });
    
    // Open Graph (Facebook/LinkedIn)
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: 'https://tudominio.com' });
    this.meta.updateTag({ property: 'og:title', content: 'Peluquería - Reserva tu cita online' });
    this.meta.updateTag({ property: 'og:description', content: 'Los mejores profesionales a tu servicio. Reserva tu cita fácilmente.' });
    this.meta.updateTag({ property: 'og:image', content: 'https://tudominio.com/assets/portada.jpg' });
    this.meta.updateTag({ property: 'og:image:alt', content: 'Interior de la peluquería' });
    this.meta.updateTag({ property: 'og:locale', content: 'es_ES' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Nombre Peluquería' });
    
    // Twitter Cards
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:site', content: '@tuusuario' });
    this.meta.updateTag({ name: 'twitter:title', content: 'Peluquería - Reserva tu cita online' });
    this.meta.updateTag({ name: 'twitter:description', content: 'Los mejores profesionales a tu servicio' });
    this.meta.updateTag({ name: 'twitter:image', content: 'https://tudominio.com/assets/portada.jpg' });
    this.meta.updateTag({ name: 'twitter:image:alt', content: 'Interior de la peluquería' });
    
    // Theme color (color de la barra de navegador móvil)
    this.meta.updateTag({ name: 'theme-color', content: '#D4A574' });
  }
}
