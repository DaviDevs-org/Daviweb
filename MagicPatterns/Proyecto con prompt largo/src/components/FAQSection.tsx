import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
// FAQ Item component
const FAQItem = ({
  question,
  answer
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return <div className="border-b border-neutral-200">
      <button className="flex justify-between items-center w-full py-4 text-left font-medium" onClick={() => setIsOpen(!isOpen)}>
        <span>{question}</span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && <div className="pb-4 text-neutral-600">
          <p>{answer}</p>
        </div>}
    </div>;
};
export const FAQSection = () => {
  const faqs = [{
    question: '¿Cómo reservo si aún no está habilitado el sistema online?',
    answer: 'Por teléfono, WhatsApp o viniendo directamente al local. En breve lanzaremos la opción de reservas online.'
  }, {
    question: '¿Se puede comprar productos si no vivo cerca?',
    answer: 'Sí, enviamos a toda España. Pregúntanos por WhatsApp para más detalles sobre envíos y disponibilidad.'
  }, {
    question: '¿Aceptan pagos con tarjeta o solo efectivo?',
    answer: 'Actualmente aceptamos ambos; pronto también pasarelas de pago online para reservas y compras en nuestra web.'
  }, {
    question: '¿Cuánto tiempo dura un corte de pelo completo?',
    answer: 'Dependiendo del tipo de corte, entre 25 y 45 minutos. Los servicios que incluyen barba pueden tomar hasta una hora.'
  }, {
    question: '¿Necesito cita previa o puedo ir sin reservar?',
    answer: 'Recomendamos reservar para evitar esperas, pero también atendemos sin cita previa según disponibilidad del momento.'
  }];
  return <section className="py-16 bg-neutral-100">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl font-bold mb-12 text-center">
          Preguntas Frecuentes
        </h2>
        <div className="max-w-3xl mx-auto">
          {faqs.map((faq, index) => <FAQItem key={index} {...faq} />)}
        </div>
      </div>
    </section>;
};