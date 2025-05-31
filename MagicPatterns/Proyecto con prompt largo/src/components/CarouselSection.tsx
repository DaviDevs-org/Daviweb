import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
export const CarouselSection = () => {
  const slides = [{
    image: 'https://images.unsplash.com/photo-1584433144859-1fc3ab64a957?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1480&q=80',
    caption: 'Corte clásico fade – Cliente: Pedro L.'
  }, {
    image: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1548&q=80',
    caption: 'Afeitado con navaja – Cliente: Marco S.'
  }, {
    image: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    caption: 'Corte texturizado – Cliente: Antonio G.'
  }, {
    image: 'https://images.unsplash.com/photo-1593702288056-f5834bac9d26?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80',
    caption: 'Estilo vintage – Cliente: Raúl M.'
  }];
  const [currentIndex, setCurrentIndex] = useState(0);
  // Auto-advance the carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => prevIndex === slides.length - 1 ? 0 : prevIndex + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);
  const prevSlide = () => {
    setCurrentIndex(prevIndex => prevIndex === 0 ? slides.length - 1 : prevIndex - 1);
  };
  const nextSlide = () => {
    setCurrentIndex(prevIndex => prevIndex === slides.length - 1 ? 0 : prevIndex + 1);
  };
  const goToSlide = index => {
    setCurrentIndex(index);
  };
  return <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-4 text-center">Fotos del Día</h2>
        <p className="text-center text-neutral-600 mb-12 max-w-2xl mx-auto">
          Algunos de los trabajos más recientes realizados en nuestra barbería.
        </p>
        <div className="relative max-w-4xl mx-auto">
          {/* Carousel container */}
          <div className="overflow-hidden rounded-lg h-[500px]">
            <div className="flex transition-transform duration-500 ease-out h-full" style={{
            transform: `translateX(-${currentIndex * 100}%)`
          }}>
              {slides.map((slide, index) => <div key={index} className="min-w-full h-full relative">
                  <img src={slide.image} alt={`Slide ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-4">
                    <p className="text-lg">{slide.caption}</p>
                  </div>
                </div>)}
            </div>
          </div>
          {/* Navigation arrows */}
          <button onClick={prevSlide} className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition">
            <ChevronLeft size={24} />
          </button>
          <button onClick={nextSlide} className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition">
            <ChevronRight size={24} />
          </button>
          {/* Indicator dots */}
          <div className="flex justify-center mt-4 space-x-2">
            {slides.map((_, index) => <button key={index} onClick={() => goToSlide(index)} className={`w-3 h-3 rounded-full ${index === currentIndex ? 'bg-black' : 'bg-gray-300'}`} />)}
          </div>
        </div>
        <div className="mt-8 text-center">
          <button className="bg-black text-white px-6 py-3 rounded-md font-medium hover:bg-neutral-800 transition">
            Ver galería completa
          </button>
        </div>
      </div>
    </section>;
};