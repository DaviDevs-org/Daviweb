import React from 'react';
import { Star } from 'lucide-react';
// Helper component for star rating
const StarRating = ({
  rating
}) => {
  return <div className="flex">
      {[...Array(5)].map((_, i) => <Star key={i} size={16} className={i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />)}
    </div>;
};
// Review card component
const ReviewCard = ({
  name,
  source,
  rating,
  comment,
  image
}) => {
  return <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
      <div className="flex items-center mb-4">
        <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>
        <div>
          <h4 className="font-medium">{name}</h4>
          <p className="text-sm text-neutral-500">{source}</p>
        </div>
      </div>
      <StarRating rating={rating} />
      <p className="mt-3 text-neutral-700">{comment}</p>
    </div>;
};
export const ReviewsSection = () => {
  const reviews = [{
    name: 'Juan P.',
    source: 'Google',
    rating: 5,
    comment: 'Excelente trato, corte preciso en 20 minutos. Recomiendo el fade con degradado.',
    image: 'https://randomuser.me/api/portraits/men/32.jpg'
  }, {
    name: 'Carlos M.',
    source: 'Cliente Habitual',
    rating: 5,
    comment: 'Llevo viniendo 3 años y nunca me han decepcionado. El mejor lugar para un buen fade.',
    image: 'https://randomuser.me/api/portraits/men/46.jpg'
  }, {
    name: 'Miguel A.',
    source: 'Google',
    rating: 4,
    comment: 'Ambiente genial, buenos precios y atención personalizada. Solo 4 estrellas porque a veces hay que esperar.',
    image: 'https://randomuser.me/api/portraits/men/55.jpg'
  }];
  return <section className="py-16 bg-neutral-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-4 text-center">
          Lo que dicen nuestros clientes
        </h2>
        <p className="text-center text-neutral-600 mb-12 max-w-2xl mx-auto">
          Nos esforzamos por ofrecer la mejor experiencia a cada cliente que
          entra por nuestra puerta. Esto es lo que opinan de nosotros.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, index) => <ReviewCard key={index} {...review} />)}
        </div>
        <div className="mt-10 text-center">
          <a href="https://g.page/r/EXAMPLE" target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-neutral-700 hover:text-black">
            Ver más reseñas en Google
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </section>;
};