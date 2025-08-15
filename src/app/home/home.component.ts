import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { AboutUsComponent } from '../about-us/about-us.component';
import { LocationAndContactComponent } from '../location-and-contact/location-and-contact.component';
import { OpinionsComponent } from '../opinions/opinions.component';
import { AppointmentComponent } from '../appointment/appointment.component';
import { FaqComponent } from '../faq/faq.component';
import { FooterComponent } from '../footer/footer.component';
import { PhotoOfTheDayComponent } from '../photo-of-the-day/photo-of-the-day.component';
import { ServicesInfoComponent } from '../services-info/services-info.component';

@Component({
  selector: 'app-home',
  imports: [HeaderComponent, AboutUsComponent, LocationAndContactComponent,
  OpinionsComponent, FaqComponent, FooterComponent, PhotoOfTheDayComponent,
  ServicesInfoComponent, AppointmentComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
