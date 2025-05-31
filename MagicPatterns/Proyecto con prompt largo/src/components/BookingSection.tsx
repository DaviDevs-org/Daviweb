import React from 'react';
import { Calendar, Clock, User, Phone, Mail, MessageSquare, Scissors } from 'lucide-react';
export const BookingSection = () => {
  return <section id="booking" className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-4 text-center">Reserva tu Cita</h2>
        <p className="text-center text-neutral-600 mb-12 max-w-2xl mx-auto">
          Próximamente podrás reservar tu cita online. Mientras tanto, puedes
          contactarnos por teléfono o WhatsApp.
        </p>
        <div className="max-w-3xl mx-auto bg-neutral-100 p-8 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form Fields */}
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Nombre completo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User size={16} className="text-neutral-500" />
                  </div>
                  <input type="text" className="bg-white w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black" placeholder="Tu nombre" disabled />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Teléfono
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone size={16} className="text-neutral-500" />
                  </div>
                  <input type="tel" className="bg-white w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black" placeholder="Tu teléfono" disabled />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail size={16} className="text-neutral-500" />
                  </div>
                  <input type="email" className="bg-white w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black" placeholder="Tu email" disabled />
                </div>
              </div>
            </div>
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Fecha deseada
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={16} className="text-neutral-500" />
                  </div>
                  <input type="text" className="bg-white w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black" placeholder="Seleccionar fecha" disabled />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Servicio
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Scissors size={16} className="text-neutral-500" />
                  </div>
                  <select className="bg-white w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black appearance-none" disabled>
                    <option>Seleccionar servicio</option>
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Comentarios adicionales
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <MessageSquare size={16} className="text-neutral-500" />
                  </div>
                  <textarea className="bg-white w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black" rows={3} placeholder="Comentarios adicionales" disabled></textarea>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button className="w-full bg-neutral-400 text-white py-3 rounded-md font-medium cursor-not-allowed" disabled>
              Enviar solicitud de cita
            </button>
            <p className="text-center mt-4 text-sm text-neutral-500">
              Estamos adaptándonos para ofrecerte la mejor experiencia de
              reserva online. Mientras tanto, llámanos o envíanos un WhatsApp al
              +34 600 000 000
            </p>
          </div>
        </div>
      </div>
    </section>;
};