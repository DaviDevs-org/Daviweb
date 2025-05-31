import React from 'react';
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react';
export const Footer = () => {
  return <footer id="contact" className="bg-black text-white pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Contact Info */}
          <div>
            <h3 className="text-xl font-bold mb-4">Contacto</h3>
            <div className="flex items-center mb-3">
              <MapPin size={18} className="mr-2" />
              <p>Calle Falsa 123, Ciudad, País</p>
            </div>
            <div className="flex items-center mb-3">
              <Phone size={18} className="mr-2" />
              <a href="tel:+34600000000" className="hover:text-gray-300">
                +34 600 000 000
              </a>
            </div>
            <div className="flex items-center mb-3">
              <Mail size={18} className="mr-2" />
              <a href="mailto:info@barberiamoderna.com" className="hover:text-gray-300">
                info@barberiamoderna.com
              </a>
            </div>
          </div>
          {/* Hours */}
          <div>
            <h3 className="text-xl font-bold mb-4">Horario</h3>
            <div className="grid grid-cols-2 gap-2">
              <p className="text-gray-400">Lunes a Viernes:</p>
              <p>10:00–20:00</p>
              <p className="text-gray-400">Sábado:</p>
              <p>9:00–18:00</p>
              <p className="text-gray-400">Domingo:</p>
              <p>Cerrado</p>
            </div>
          </div>
          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold mb-4">Enlaces</h3>
            <ul className="space-y-2">
              <li>
                <a href="#featured" className="hover:text-gray-300">
                  Nuestros Cortes
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-gray-300">
                  Servicios y Precios
                </a>
              </li>
              <li>
                <a href="#booking" className="hover:text-gray-300">
                  Reservar Cita
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-300">
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-gray-300">
                  Términos y Condiciones
                </a>
              </li>
            </ul>
          </div>
          {/* Social & Newsletter */}
          <div>
            <h3 className="text-xl font-bold mb-4">Síguenos</h3>
            <div className="flex space-x-4 mb-6">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                <Instagram size={24} />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                <Facebook size={24} />
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Barbería Moderna. Todos los
            derechos reservados.
          </p>
        </div>
      </div>
    </footer>;
};