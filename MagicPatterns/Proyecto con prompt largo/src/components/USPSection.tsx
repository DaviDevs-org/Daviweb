import React from 'react';
import { Award, Star } from 'lucide-react';
export const USPSection = () => {
  return <section className="py-16 bg-neutral-900 text-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <Award size={48} className="text-yellow-500" />
          </div>
          <h2 className="text-3xl font-bold mb-6 text-center">
            Experiencia Única de Barbería
          </h2>
          <p className="text-xl text-center mb-12">
            La única barbería en <span className="font-semibold">Ciudad</span>{' '}
            que ofrece{' '}
            <span className="font-semibold">
              técnicas japonesas de afeitado
            </span>{' '}
            combinadas con estilos contemporáneos.
          </p>
          <div className="bg-neutral-800 p-8 rounded-lg">
            <div className="flex items-start">
              <div className="mr-4 mt-1">
                <Star size={20} className="text-yellow-500 fill-yellow-500" />
              </div>
              <div>
                <p className="italic text-neutral-300">
                  "Gracias al servicio exclusivo de afeitado japonés, he logrado
                  un estilo impecable que ningún otro barbero conseguía. La
                  experiencia es completamente diferente."
                </p>
                <p className="mt-4 font-medium">Luis M. - Cliente desde 2020</p>
              </div>
            </div>
          </div>
          <p className="mt-8 text-center text-neutral-400">
            Mientras muchas barberías ofrecen lo mismo, en Barbería Moderna
            hemos desarrollado un servicio patentado de afeitado con técnicas
            japonesas que no encontrarás en ningún otro lugar de la ciudad.
          </p>
        </div>
      </div>
    </section>;
};