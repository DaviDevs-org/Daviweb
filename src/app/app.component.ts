import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import {AboutUsComponent} from './about-us/about-us.component';
import {LocationAndContactComponent} from './location-and-contact/location-and-contact.component';
import {OpinionComponent} from './opinion/opinion.component';
import {OpinionsComponent} from './opinions/opinions.component';
import {StarComponent} from './star/star.component';
import {ButtonComponent} from './button/button.component';
import {FaqComponent} from './faq/faq.component';
import {FooterComponent} from './footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, AboutUsComponent, LocationAndContactComponent, OpinionComponent, OpinionsComponent, StarComponent, ButtonComponent, FaqComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Daviweb';
}
