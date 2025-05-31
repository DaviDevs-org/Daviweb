import React from 'react';
import { ShoppingBag } from 'lucide-react';
// Product card component
const ProductCard = ({
  name,
  price,
  description,
  image
}) => {
  return <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-neutral-200 hover:shadow-md transition">
      <div className="h-48 overflow-hidden">
        <img src={image} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium">{name}</h3>
          <span className="font-semibold">{price}€</span>
        </div>
        <p className="text-neutral-600 text-sm mb-4">{description}</p>
        <button className="w-full bg-black text-white py-2 rounded-md text-sm font-medium hover:bg-neutral-800 transition flex items-center justify-center">
          <ShoppingBag size={16} className="mr-2" />
          Añadir al carrito
        </button>
      </div>
    </div>;
};
export const ProductsSection = () => {
  const products = [{
    name: 'Pomada Matte Hold',
    price: 15,
    description: 'Fijación suave, acabado mate. Ideal para estilos naturales.',
    image: 'https://images.unsplash.com/photo-1626120032630-b51c96e2f e8d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1548&q=80'
  }, {
    name: 'Cera Texturizante',
    price: 18,
    description: 'Textura y definición con fijación media y brillo natural.',
    image: 'https://images.unsplash.com/photo-1597354984706-fac992d9306f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1376&q=80'
  }, {
    name: 'Aceite para Barba',
    price: 22,
    description: 'Hidrata y acondiciona la barba, evitando la resequedad.',
    image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1035&q=80'
  }, {
    name: 'Champú Especializado',
    price: 14,
    description: 'Limpia en profundidad sin resecar el cabello.',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80'
  }, {
    name: 'Cepillo para Barba',
    price: 12,
    description: 'Cepillo de cerdas naturales para un peinado perfecto.',
    image: 'https://images.unsplash.com/photo-1621460248137-1e1c7aae7a9d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80'
  }, {
    name: 'Navaja Clásica',
    price: 28,
    description: 'Navaja de afeitar tradicional con mango de madera.',
    image: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1544&q=80'
  }];
  return <section className="py-16 bg-neutral-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-4 text-center">
          Productos en Venta
        </h2>
        <p className="text-center text-neutral-600 mb-12 max-w-2xl mx-auto">
          Llévate a casa los productos profesionales que usamos en nuestra
          barbería.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, index) => <ProductCard key={index} {...product} />)}
        </div>
        <div className="mt-12 text-center bg-white p-8 rounded-lg shadow-sm max-w-2xl mx-auto">
          <h3 className="text-2xl font-bold mb-4">¿Quieres comprar online?</h3>
          <p className="mb-6 text-neutral-600">
            Próximamente habilitaremos nuestra tienda online para que puedas
            recibir tus productos favoritos directamente en casa.
          </p>
          <button className="bg-black text-white px-6 py-3 rounded-md font-medium hover:bg-neutral-800 transition">
            Comprar productos
          </button>
        </div>
      </div>
    </section>;
};