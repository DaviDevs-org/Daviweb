import React from 'react';
// Featured haircut card component
const HaircutCard = ({
  title,
  description,
  image
}) => {
  return <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-200 hover:shadow-md transition">
      <div className="h-64 overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover transition-transform hover:scale-105" />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-neutral-600 mb-4">{description}</p>
        <button className="w-full bg-black text-white py-2 rounded-md font-medium hover:bg-neutral-800 transition">
          Reservar este corte
        </button>
      </div>
    </div>;
};
export const FeaturedCutsSection = () => {
  const featuredCuts = [{
    title: 'Low Fade',
    description: 'Degradado suave que se desvanece bajo, ideal para un look limpio y profesional.',
    image: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80'
  }, {
    title: 'Beard Trim + Fade',
    description: 'Recorte de barba perfectamente alineado con un fade que complementa el estilo.',
    image: 'https://images.unsplash.com/photo-1624451332585-01d9d96cf944?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80'
  }, {
    title: 'Corte Clásico con Tijera',
    description: 'El clásico corte con tijera para un estilo elegante y atemporal.',
    image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1023&q=80'
  }, {
    title: 'Pompadour Moderno',
    description: 'Estilo clásico reinventado con volumen en la parte superior y laterales cortos.',
    image: 'https://images.unsplash.com/photo-1620574387735-3624d75e5972?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80'
  }, {
    title: 'Crew Cut',
    description: 'Corte militar actualizado, práctico y de bajo mantenimiento.',
    image: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
  }, {
    title: 'Texturizado con Volumen',
    description: 'Corte con textura y movimiento en la parte superior para un look dinámico.',
    image: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80'
  }];
  return <section id="featured" className="py-16 bg-neutral-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-4 text-center">
          Cortes Destacados
        </h2>
        <p className="text-center text-neutral-600 mb-12 max-w-2xl mx-auto">
          Nuestros estilos más populares, realizados por barberos expertos con
          años de experiencia.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredCuts.map((cut, index) => <HaircutCard key={index} {...cut} />)}
        </div>
      </div>
    </section>;
};