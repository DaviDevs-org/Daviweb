// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { HeaderComponent } from './components/header/header.component';
import { LocationSectionComponent } from './components/location-section/location-section.component';
import { ReviewsSectionComponent } from './components/reviews-section/reviews-section.component';
import { CarouselSectionComponent } from './components/carousel-section/carousel-section.component';
import { FeaturedCutsSectionComponent } from './components/featured-cuts-section/featured-cuts-section.component';
import { PriceListSectionComponent } from './components/price-list-section/price-list-section.component';
import { ProductsSectionComponent } from './components/products-section/products-section.component';
import { BookingSectionComponent } from './components/booking-section/booking-section.component';
import { USPSectionComponent } from './components/usp-section/usp-section.component';
import { AboutSectionComponent } from './components/about-section/about-section.component';
import { FAQSectionComponent } from './components/faq-section/faq-section.component';
import { FooterComponent } from './components/footer/footer.component';
import { isBarberShopOpen, getNextOpeningTime } from './lib/utils';

@NgModule({
  declarations: [
    
  ],
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    AppComponent,
    HeaderComponent,
    LocationSectionComponent,
    ReviewsSectionComponent,
    CarouselSectionComponent,
    FeaturedCutsSectionComponent,
    PriceListSectionComponent,
    ProductsSectionComponent,
    BookingSectionComponent,
    USPSectionComponent,
    AboutSectionComponent,
    FAQSectionComponent,
    FooterComponent
  ],
})
export class AppModule { }
