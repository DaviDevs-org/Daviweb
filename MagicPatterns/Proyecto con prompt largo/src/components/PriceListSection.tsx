import React from 'react';
import { Clock, Scissors } from 'lucide-react';
// Price item component
const PriceItem = ({
  service,
  price,
  duration,
  isPremium = false
}) => {
  return <div className={`p-4 border-b ${isPremium ? 'bg-neutral-100 rounded-md' : ''}`}>
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">{service}</h3>
          <p className="text-neutral-600 flex items-center mt-1">
            <Clock size={16} className="mr-1" /> Aprox. {duration} min
          </p>
        </div>
        <div className="text-xl font-semibold">{price}€</div>
      </div>
    </div>;
};
export const PriceListSection = () => {
  const services = [{
    service: 'Corte Clásico',
    price: 20,
    duration: 25
  }, {
    service: 'Fade Completo',
    price: 25,
    duration: 30,
    isPremium: true
  }, {
    service: 'Corte + Afeitado',
    price: 30,
    duration: 45,
    isPremium: true
  }, {
    service: 'Afeitado Tradicional',
    price: 15,
    duration: 20
  }, {
    service: 'Recorte de Barba',
    price: 12,
    duration: 15
  }, {
    service: 'Peinado y Styling',
    price: 10,
    duration: 10
  }, {
    service: 'Tratamiento Capilar',
    price: 35,
    duration: 40,
    isPremium: true
  }, {
    service: 'Corte Infantil',
    price: 15,
    duration: 20
  }];
  return <section id="services" className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-4 text-center">
          Servicios y Precios
        </h2>
        <p className="text-center text-neutral-600 mb-12 max-w-2xl mx-auto">
          Ofrecemos una amplia gama de servicios de barbería profesional a
          precios competitivos.
        </p>
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-1 gap-2">
            {services.map((item, index) => <PriceItem key={index} {...item} />)}
          </div>
          <p className="mt-6 text-sm text-neutral-500 italic">
            * Los tiempos pueden variar según tipo de cabello. Consulta si
            necesitas un servicio personalizado.
          </p>
        </div>
      </div>
    </section>;
};