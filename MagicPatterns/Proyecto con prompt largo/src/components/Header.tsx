import React from 'react';
import { Clock, MapPin, Phone } from 'lucide-react';
// Helper function to check if the barbershop is currently open
const isBarberShopOpen = () => {
  // This is a placeholder function - in a real implementation,
  // you would check current day and time against opening hours
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const hour = now.getHours();
  // Example logic: Open Monday-Friday 10:00-20:00, Saturday 9:00-18:00, closed Sunday
  if (day === 0) return false; // Closed on Sunday
  if (day === 6) return hour >= 9 && hour < 18; // Saturday 9:00-18:00
  return hour >= 10 && hour < 20; // Monday-Friday 10:00-20:00
};
// Helper function to get next opening time if closed
const getNextOpeningTime = () => {
  const now = new Date();
  const day = now.getDay();
  // This is simplified logic - you would expand this based on actual opening days/hours
  if (day === 0) {
    // If Sunday, open Monday
    return 'Reabrimos el Lunes a las 10:00';
  } else if (day === 6 && now.getHours() >= 18) {
    // If Saturday after closing
    return 'Reabrimos el Lunes a las 10:00';
  } else {
    // For other days, reopen tomorrow
    return 'Reabrimos mañana a las 10:00';
  }
};
export const Header = () => {
  const isOpen = isBarberShopOpen();
  return <header className="w-full">
      {/* Top bar with announcement */}
      <div className="bg-black text-white text-center py-2 text-sm">
        <p>Próximamente: reservas online y pago telemático</p>
      </div>
      {/* Navigation */}
      <nav className="bg-white py-4 px-6 flex items-center justify-between border-b">
        <div className="flex items-center">
          {/* Replace with actual logo */}
          <h1 className="text-2xl font-bold">BARBERÍA MODERNA</h1>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          <a href="#location" className="text-neutral-700 hover:text-black flex items-center">
            <MapPin size={16} className="mr-1" /> Ubicación
          </a>
          <a href="#services" className="text-neutral-700 hover:text-black flex items-center">
            <Clock size={16} className="mr-1" /> Servicios
          </a>
          <a href="#contact" className="text-neutral-700 hover:text-black flex items-center">
            <Phone size={16} className="mr-1" /> Contacto
          </a>
        </div>
        <div className="flex items-center">
          <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}>
            {isOpen ? 'Abierto' : 'Cerrado'}
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <div className="relative h-[80vh] bg-cover bg-center flex items-center" style={{
      backgroundImage: "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80')"
    }}>
        <div className="container mx-auto px-6">
          <div className="max-w-xl">
            <h1 className="text-5xl font-bold text-white mb-4">
              Estilo y Precisión en Cada Corte
            </h1>
            <p className="text-xl text-gray-200 mb-8">
              La barbería de referencia para el hombre moderno. Cortes clásicos
              con un toque contemporáneo.
            </p>
            {/* Open/Closed Status with next opening time */}
            <div className="mb-8">
              <div className={`inline-flex items-center px-4 py-2 rounded-md ${isOpen ? 'bg-green-500' : 'bg-red-500'} text-white font-medium`}>
                {isOpen ? 'Abierto Ahora' : 'Cerrado'}
              </div>
              {!isOpen && <p className="text-white mt-2">{getNextOpeningTime()}</p>}
            </div>
            <div className="flex flex-wrap gap-4">
              <a href="#booking" className="bg-white text-black px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition">
                Reserva tu cita
              </a>
              <a href="#featured" className="bg-transparent text-white border border-white px-6 py-3 rounded-md font-medium hover:bg-white hover:text-black transition">
                Ver nuestros cortes
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>;
};