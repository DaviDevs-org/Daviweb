import React from 'react';
import { Scissors } from 'lucide-react';
export const AboutSection = () => {
  return <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            Sobre Nosotros
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="text-lg mb-6">
                Somos Miguel y Javier, apasionados por el oficio desde hace más
                de 15 años. Nuestro objetivo es combinar tradición y modernidad
                para que cada cliente salga satisfecho.
              </p>
              <p className="text-lg mb-6">
                Fundamos Barbería Moderna en 2015 con la visión de crear un
                espacio donde los hombres pudieran recibir un servicio de
                calidad, en un ambiente relajado y con resultados profesionales.
              </p>
              <p className="text-lg">
                Cada miembro de nuestro equipo está certificado y en constante
                formación para ofrecerte las últimas tendencias y técnicas.
              </p>
            </div>
            <div className="relative">
              <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1474&q=80" alt="Nuestro equipo" className="rounded-lg shadow-md" />
              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 text-neutral-200">
                <Scissors size={32} />
              </div>
              <div className="absolute -bottom-4 -right-4 text-neutral-200">
                <Scissors size={32} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};