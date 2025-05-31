import React from 'react';
import { Header } from './components/Header';
import { LocationSection } from './components/LocationSection';
import { ReviewsSection } from './components/ReviewsSection';
import { CarouselSection } from './components/CarouselSection';
import { FeaturedCutsSection } from './components/FeaturedCutsSection';
import { PriceListSection } from './components/PriceListSection';
import { ProductsSection } from './components/ProductsSection';
import { BookingSection } from './components/BookingSection';
import { USPSection } from './components/USPSection';
import { AboutSection } from './components/AboutSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
export function App() {
  return <div className="flex flex-col min-h-screen w-full bg-neutral-50">
      <Header />
      <main className="flex-grow">
        <LocationSection />
        <ReviewsSection />
        <CarouselSection />
        <FeaturedCutsSection />
        <PriceListSection />
        <ProductsSection />
        <BookingSection />
        <USPSection />
        <AboutSection />
        <FAQSection />
      </main>
      <Footer />
    </div>;
}