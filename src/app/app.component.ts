import { Component } from '@angular/core';
import { HeaderComponent } from './header/header.component';
import {AboutUsComponent} from './about-us/about-us.component';
import {LocationAndContactComponent} from './location-and-contact/location-and-contact.component';
import {OpinionsComponent} from './opinions/opinions.component';
import {FaqComponent} from './faq/faq.component';
import {FooterComponent} from './footer/footer.component';
import { PhotoOfTheDayComponent } from './photo-of-the-day/photo-of-the-day.component';
import { FeaturedCutsComponent } from './featured-cuts/featured-cuts.component';
import { AppointmentComponent } from './appointment/appointment.component';
import { ServicesComponent } from './services/services.component';

@Component({
  selector: 'app-root',
  imports: 
  [HeaderComponent, AboutUsComponent, LocationAndContactComponent, 
  OpinionsComponent, FaqComponent, FooterComponent, PhotoOfTheDayComponent,
  FeaturedCutsComponent, AppointmentComponent, ServicesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Daviweb';
}
