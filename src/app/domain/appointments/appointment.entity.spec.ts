import { Appointment } from './appointment.entity';
import { AppointmentService } from '@domain/services/service.types';
import { Service, TimeSegment } from '@domain/services/service.entity';

describe('Appointment Entity', () => {
  // Test fixtures
  const mockService: AppointmentService = {
    name: 'Corte de pelo',
    timeSegments: [{ duration: 30, breakAfter: 0 }],
    requiresHairLength: false,
  };

  const mockServiceWithHairLength: AppointmentService = {
    name: 'Tinte completo',
    timeSegments: [{ duration: 60, breakAfter: 15 }],
    requiresHairLength: true,
    hairLengthModifiers: {
      short: { time: 45 },
      medium: { time: 60 },
      long: { time: 90 },
    },
  };

  describe('Constructor', () => {
    it('should create an appointment with all required fields', () => {
      const datetime = new Date('2025-01-15T10:30:00');
      const appointment = new Appointment(datetime, mockService);

      expect(appointment.datetime).toEqual(datetime);
      expect(appointment.service).toEqual(mockService);
      expect(appointment.id).toBeUndefined();
      expect(appointment.description).toBeUndefined();
      expect(appointment.name).toBeUndefined();
      expect(appointment.phone).toBeUndefined();
      expect(appointment.barber).toBeUndefined();
      expect(appointment.hairLengthChoice).toBeUndefined();
    });

    it('should create an appointment with all optional fields', () => {
      const datetime = new Date('2025-01-15T10:30:00');
      const appointment = new Appointment(
        datetime,
        mockService,
        'apt-123',
        'Cliente VIP',
        'Juan García',
        '612345678',
        'Carlos',
        'medium'
      );

      expect(appointment.id).toBe('apt-123');
      expect(appointment.description).toBe('Cliente VIP');
      expect(appointment.name).toBe('Juan García');
      expect(appointment.phone).toBe('612345678');
      expect(appointment.barber).toBe('Carlos');
      expect(appointment.hairLengthChoice).toBe('medium');
    });

    it('should calculate dateISO correctly from datetime', () => {
      const datetime = new Date('2025-06-20T14:45:00');
      const appointment = new Appointment(datetime, mockService);

      expect(appointment.dateISO).toBe('2025-06-20');
    });

    it('should normalize timeNormalized with zero-padded hours and minutes', () => {
      const datetime = new Date('2025-01-15T09:05:00');
      const appointment = new Appointment(datetime, mockService);

      expect(appointment.timeNormalized).toBe('09:05');
    });

    it('should normalize time for afternoon hours', () => {
      const datetime = new Date('2025-01-15T16:30:00');
      const appointment = new Appointment(datetime, mockService);

      expect(appointment.timeNormalized).toBe('16:30');
    });
  });

  describe('toDTO()', () => {
    it('should convert appointment to DTO with all fields', () => {
      const datetime = new Date('2025-01-15T10:30:00');
      const appointment = new Appointment(
        datetime,
        mockService,
        'apt-123',
        'Nota especial',
        'María López',
        '666111222',
        'Pedro',
        'short'
      );

      const dto = appointment.toDTO();

      expect(dto.datetime).toEqual(datetime);
      expect(dto.service).toEqual(mockService);
      expect(dto.description).toBe('Nota especial');
      expect(dto.name).toBe('María López');
      expect(dto.phone).toBe('666111222');
      expect(dto.barber).toBe('Pedro');
      expect(dto.hairLengthChoice).toBe('short');
      expect(dto.createdAt).toBeInstanceOf(Date);
    });

    it('should set null for undefined optional fields in DTO', () => {
      const datetime = new Date('2025-01-15T10:30:00');
      const appointment = new Appointment(datetime, mockService);

      const dto = appointment.toDTO();

      expect(dto.description).toBeNull();
      expect(dto.name).toBeNull();
      expect(dto.phone).toBeNull();
      expect(dto.barber).toBeNull();
      expect(dto.hairLengthChoice).toBeNull();
    });

    it('should convert Service instance to AppointmentService', () => {
      const datetime = new Date('2025-01-15T10:30:00');
      const serviceEntity = new Service(
        'Corte moderno',
        'Descripción del servicio',
        [{ duration: 45, breakAfter: 5 }]
      );
      const appointment = new Appointment(datetime, serviceEntity as any);

      const dto = appointment.toDTO();

      expect(dto.service.name).toBe('Corte moderno');
      expect(dto.service.timeSegments).toEqual([{ duration: 45, breakAfter: 5 }]);
    });
  });

  describe('fromDTO() - Static Factory', () => {
    it('should create Appointment from DTO without id', () => {
      const dto = {
        datetime: new Date('2025-02-10T11:00:00'),
        createdAt: new Date(),
        service: mockService,
        description: 'Test',
        name: 'Test User',
        phone: '600000000',
        barber: 'Barbero1',
        hairLengthChoice: 'long' as const,
      };

      const appointment = Appointment.fromDTO(dto);

      expect(appointment.datetime).toEqual(dto.datetime);
      expect(appointment.service).toEqual(mockService);
      expect(appointment.description).toBe('Test');
      expect(appointment.name).toBe('Test User');
      expect(appointment.id).toBeUndefined();
    });

    it('should create Appointment from DTO with id', () => {
      const dto = {
        datetime: new Date('2025-02-10T11:00:00'),
        createdAt: new Date(),
        service: mockService,
        description: null,
        name: null,
        phone: null,
        barber: null,
        hairLengthChoice: null,
      };

      const appointment = Appointment.fromDTO(dto, 'custom-id-456');

      expect(appointment.id).toBe('custom-id-456');
    });

    it('should preserve hairLengthChoice from DTO', () => {
      const dto = {
        datetime: new Date('2025-02-10T11:00:00'),
        createdAt: new Date(),
        service: mockServiceWithHairLength,
        description: null,
        name: null,
        phone: null,
        barber: null,
        hairLengthChoice: 'medium' as const,
      };

      const appointment = Appointment.fromDTO(dto);

      expect(appointment.hairLengthChoice).toBe('medium');
    });
  });

  describe('Edge Cases', () => {
    it('should handle midnight time correctly', () => {
      const datetime = new Date('2025-01-01T00:00:00');
      const appointment = new Appointment(datetime, mockService);

      expect(appointment.timeNormalized).toBe('00:00');
    });

    it('should handle end of day time correctly', () => {
      const datetime = new Date('2025-01-01T23:59:00');
      const appointment = new Appointment(datetime, mockService);

      expect(appointment.timeNormalized).toBe('23:59');
    });

    it('should handle year transition dates', () => {
      const datetime = new Date('2025-12-31T18:00:00');
      const appointment = new Appointment(datetime, mockService);

      expect(appointment.dateISO).toBe('2025-12-31');
    });
  });
});
