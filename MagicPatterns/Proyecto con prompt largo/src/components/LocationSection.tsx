import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Clock, MapPin, Phone } from 'lucide-react';
export const LocationSection = () => {
  // Example coordinates - replace with actual barbershop location
  const position = [40.416775, -3.70379]; // Madrid, Spain coordinates as example
  return <section id="location" className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-12 text-center">
          Ubicación y Contacto
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Map */}
          <div className="h-96 rounded-lg overflow-hidden shadow-md">
            <MapContainer center={position} zoom={15} style={{
            height: '100%',
            width: '100%'
          }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={position}>
                <Popup>
                  Barbería Moderna <br /> Calle Falsa 123, Ciudad, País
                </Popup>
              </Marker>
            </MapContainer>
          </div>
          {/* Contact Info */}
          <div className="bg-neutral-100 p-8 rounded-lg">
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <MapPin className="mr-2" size={20} />
                Dirección
              </h3>
              <p className="text-neutral-700">Calle Falsa 123</p>
              <p className="text-neutral-700">Ciudad, País</p>
              <div className="mt-4 flex space-x-4">
                <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-neutral-800 transition">
                  Cómo llegar
                </a>
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Phone className="mr-2" size={20} />
                Contacto
              </h3>
              <p className="text-neutral-700">
                <a href="tel:+34600000000" className="hover:underline">
                  +34 600 000 000
                </a>
              </p>
              <p className="text-neutral-700">
                <a href="mailto:info@barberiamoderna.com" className="hover:underline">
                  info@barberiamoderna.com
                </a>
              </p>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Clock className="mr-2" size={20} />
                Horario
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <p className="text-neutral-700">Lunes a Viernes:</p>
                <p className="text-neutral-700">10:00–20:00</p>
                <p className="text-neutral-700">Sábado:</p>
                <p className="text-neutral-700">9:00–18:00</p>
                <p className="text-neutral-700">Domingo:</p>
                <p className="text-neutral-700">Cerrado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};