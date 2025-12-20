import {
  Service,
  TimeSegment,
  HairLengthModifiers,
} from './service.entity';

describe('Service Entity', () => {
  describe('Constructor', () => {
    it('should create a basic service with required fields', () => {
      const service = new Service('Corte básico', 'Corte de pelo tradicional');

      expect(service.name).toBe('Corte básico');
      expect(service.description).toBe('Corte de pelo tradicional');
      expect(service.timeSegments).toEqual([]);
      expect(service.requiresHairLength).toBeFalse();
    });

    it('should create a service with time segments', () => {
      const segments: TimeSegment[] = [
        { duration: 30, breakAfter: 5 },
        { duration: 15, breakAfter: 0 },
      ];
      const service = new Service('Corte completo', 'Con lavado', segments);

      expect(service.timeSegments).toEqual(segments);
    });

    it('should create a service with hair length requirement', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 30 },
        medium: { time: 45 },
        long: { time: 60 },
      };

      const service = new Service(
        'Tinte',
        'Coloración completa',
        [],
        true,
        modifiers
      );

      expect(service.requiresHairLength).toBeTrue();
      expect(service.hairLengthModifiers).toEqual(modifiers);
    });

    it('should create a service with hourRange restriction', () => {
      const service = new Service(
        'Servicio matutino',
        'Solo por la mañana',
        [{ duration: 60, breakAfter: 0 }],
        false,
        Service.defaultHairLengthModifiers(),
        undefined,
        undefined,
        { start: '09:00', end: '14:00' }
      );

      expect(service.hourRange).toEqual({ start: '09:00', end: '14:00' });
    });
  });

  describe('getTimeSegmentsForLength()', () => {
    it('should return base timeSegments when requiresHairLength is false', () => {
      const baseSegments: TimeSegment[] = [{ duration: 30, breakAfter: 0 }];
      const service = new Service(
        'Corte',
        'Desc',
        baseSegments,
        false
      );

      expect(service.getTimeSegmentsForLength('short')).toEqual(baseSegments);
      expect(service.getTimeSegmentsForLength('medium')).toEqual(baseSegments);
      expect(service.getTimeSegmentsForLength('long')).toEqual(baseSegments);
    });

    it('should return segments from modifier when available', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 30, segments: [{ duration: 30, breakAfter: 0 }] },
        medium: { time: 45, segments: [{ duration: 45, breakAfter: 10 }] },
        long: { time: 60, segments: [{ duration: 60, breakAfter: 15 }] },
      };

      const service = new Service('Tinte', 'Coloración', [], true, modifiers);

      expect(service.getTimeSegmentsForLength('short')).toEqual([
        { duration: 30, breakAfter: 0 },
      ]);
      expect(service.getTimeSegmentsForLength('medium')).toEqual([
        { duration: 45, breakAfter: 10 },
      ]);
      expect(service.getTimeSegmentsForLength('long')).toEqual([
        { duration: 60, breakAfter: 15 },
      ]);
    });

    it('should fallback to time-based segment when no segments array', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 30 },
        medium: { time: 45 },
        long: { time: 60 },
      };

      const service = new Service('Tinte', 'Coloración', [], true, modifiers);

      expect(service.getTimeSegmentsForLength('short')).toEqual([
        { duration: 30, breakAfter: 0 },
      ]);
      expect(service.getTimeSegmentsForLength('long')).toEqual([
        { duration: 60, breakAfter: 0 },
      ]);
    });
  });

  describe('computeTotalTime()', () => {
    it('should compute total time from timeSegments including breaks', () => {
      const service = new Service(
        'Tratamiento',
        'Desc',
        [
          { duration: 30, breakAfter: 10 },
          { duration: 20, breakAfter: 5 },
        ]
      );

      // 30 + 10 + 20 + 5 = 65
      expect(service.computeTotalTime()).toBe(65);
    });

    it('should compute total time for specific hair length', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 30, segments: [{ duration: 25, breakAfter: 5 }] },
        medium: { time: 45, segments: [{ duration: 40, breakAfter: 5 }] },
        long: {
          time: 90,
          segments: [
            { duration: 45, breakAfter: 15 },
            { duration: 30, breakAfter: 0 },
          ],
        },
      };

      const service = new Service('Tinte', 'Coloración', [], true, modifiers);

      expect(service.computeTotalTime('short')).toBe(30); // 25 + 5
      expect(service.computeTotalTime('medium')).toBe(45); // 40 + 5
      expect(service.computeTotalTime('long')).toBe(90); // 45 + 15 + 30 + 0
    });

    it('should fallback to modifier.time when no segments', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 30 },
        medium: { time: 45 },
        long: { time: 60 },
      };

      const service = new Service('Tinte', 'Desc', [], true, modifiers);

      expect(service.computeTotalTime('medium')).toBe(45);
    });

    it('should return 30 as fallback when no data', () => {
      const service = new Service('Empty', 'No segments');

      expect(service.computeTotalTime()).toBe(30);
    });
  });

  describe('getActiveTime()', () => {
    it('should compute active time without breaks', () => {
      const service = new Service(
        'Tratamiento',
        'Desc',
        [
          { duration: 30, breakAfter: 10 },
          { duration: 20, breakAfter: 5 },
        ]
      );

      // 30 + 20 = 50 (sin breaks)
      expect(service.getActiveTime()).toBe(50);
    });

    it('should compute active time for specific hair length', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 30, segments: [{ duration: 25, breakAfter: 5 }] },
        medium: { time: 45, segments: [{ duration: 40, breakAfter: 5 }] },
        long: {
          time: 90,
          segments: [
            { duration: 45, breakAfter: 15 },
            { duration: 30, breakAfter: 0 },
          ],
        },
      };

      const service = new Service('Tinte', 'Desc', [], true, modifiers);

      expect(service.getActiveTime('short')).toBe(25);
      expect(service.getActiveTime('medium')).toBe(40);
      expect(service.getActiveTime('long')).toBe(75); // 45 + 30
    });
  });

  describe('getEstimatedTimeRange()', () => {
    it('should return range for hair length services', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 30 },
        medium: { time: 45 },
        long: { time: 60 },
      };

      const service = new Service('Tinte', 'Desc', [], true, modifiers);

      expect(service.getEstimatedTimeRange()).toBe('30-60 min');
    });

    it('should return single value when all lengths are equal', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 30 },
        medium: { time: 30 },
        long: { time: 30 },
      };

      const service = new Service('Servicio', 'Desc', [], true, modifiers);

      expect(service.getEstimatedTimeRange()).toBe('30 min');
    });

    it('should return range for services with breaks', () => {
      const service = new Service(
        'Normal',
        'Desc',
        [
          { duration: 30, breakAfter: 10 },
          { duration: 20, breakAfter: 0 },
        ],
        false
      );

      // Active: 30 + 20 = 50, Total: 30 + 10 + 20 = 60
      expect(service.getEstimatedTimeRange()).toBe('50-60 min');
    });

    it('should return single value when no breaks', () => {
      const service = new Service(
        'Normal',
        'Desc',
        [{ duration: 45, breakAfter: 0 }],
        false
      );

      expect(service.getEstimatedTimeRange()).toBe('45 min');
    });
  });

  describe('toDTO()', () => {
    it('should convert service to DTO', () => {
      const service = new Service(
        'Corte',
        'Descripción',
        [{ duration: 30, breakAfter: 0 }],
        false,
        Service.defaultHairLengthModifiers(),
        'http://image.url',
        'svc-123'
      );

      const dto = service.toDTO();

      expect(dto.name).toBe('Corte');
      expect(dto.description).toBe('Descripción');
      expect(dto.timeSegments).toEqual([{ duration: 30, breakAfter: 0 }]);
      expect(dto.imageUrl).toBe('http://image.url');
      expect(dto.requiresHairLength).toBeFalse();
    });

    it('should include hourRange in DTO when present', () => {
      const service = new Service(
        'Matutino',
        'Desc',
        [],
        false,
        Service.defaultHairLengthModifiers(),
        undefined,
        undefined,
        { start: '09:00', end: '14:00' }
      );

      const dto = service.toDTO();

      expect(dto.hourRange).toEqual({ start: '09:00', end: '14:00' });
    });
  });

  describe('toAppointmentService()', () => {
    it('should convert to minimal AppointmentService', () => {
      const service = new Service(
        'Corte Premium',
        'Descripción larga',
        [{ duration: 45, breakAfter: 5 }],
        true
      );

      const appointmentService = service.toAppointmentService();

      expect(appointmentService.name).toBe('Corte Premium');
      expect(appointmentService.timeSegments).toEqual([
        { duration: 45, breakAfter: 5 },
      ]);
      expect((appointmentService as any).description).toBeUndefined();
    });
  });

  describe('fromDTO() - Static Factory', () => {
    it('should create Service from DTO', () => {
      const dto = {
        name: 'Servicio DTO',
        description: 'Descripción',
        timeSegments: [{ duration: 30, breakAfter: 0 }],
        requiresHairLength: true,
        hairLengthModifiers: {
          short: { time: 30 },
          medium: { time: 45 },
          long: { time: 60 },
        },
        imageUrl: 'http://test.com/img.jpg',
      };

      const service = Service.fromDTO(dto, 'svc-456');

      expect(service.name).toBe('Servicio DTO');
      expect(service.id).toBe('svc-456');
      expect(service.requiresHairLength).toBeTrue();
    });

    it('should use defaults for missing optional DTO fields', () => {
      const dto = {
        name: 'Básico',
        description: 'Desc',
        timeSegments: [],
      };

      const service = Service.fromDTO(dto);

      expect(service.requiresHairLength).toBeFalse();
      expect(service.hairLengthModifiers).toEqual(
        Service.defaultHairLengthModifiers()
      );
    });
  });

  describe('createEmpty() - Static Factory', () => {
    it('should create an empty service with sensible defaults', () => {
      const service = Service.createEmpty();

      expect(service.name).toBe('');
      expect(service.description).toBe('');
      expect(service.timeSegments).toEqual([{ duration: 30, breakAfter: 0 }]);
      expect(service.requiresHairLength).toBeFalse();
    });
  });

  describe('validate()', () => {
    it('should return error when name is empty', () => {
      const service = new Service('', 'Descripción', [{ duration: 30, breakAfter: 0 }]);

      expect(service.validate()).toBe('Por favor, ingresa el nombre del servicio.');
    });

    it('should return error when name is only whitespace', () => {
      const service = new Service('   ', 'Descripción', [{ duration: 30, breakAfter: 0 }]);

      expect(service.validate()).toBe('Por favor, ingresa el nombre del servicio.');
    });

    it('should return null for valid basic service', () => {
      const service = new Service('Corte', 'Desc', [{ duration: 30, breakAfter: 0 }]);

      expect(service.validate()).toBeNull();
    });

    it('should return error for invalid hair length modifiers', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 0 },
        medium: { time: 0 },
        long: { time: 0 },
      };

      const service = new Service('Tinte', 'Desc', [], true, modifiers);

      expect(service.validate()).toBe(
        'Configura un tiempo válido para cada longitud de pelo.'
      );
    });

    it('should return error when no valid time segment', () => {
      const service = new Service('Servicio', 'Desc', [{ duration: 0, breakAfter: 0 }]);

      expect(service.validate()).toBe(
        'Por favor, ingresa al menos un segmento de tiempo válido.'
      );
    });

    it('should return error for invalid hourRange', () => {
      const service = new Service(
        'Servicio',
        'Desc',
        [{ duration: 30, breakAfter: 0 }],
        false,
        Service.defaultHairLengthModifiers(),
        undefined,
        undefined,
        { start: '14:00', end: '09:00' } // End before start
      );

      expect(service.validate()).toBe(
        'El fin del rango debe ser posterior al inicio.'
      );
    });

    it('should return error for incomplete hourRange', () => {
      const service = new Service(
        'Servicio',
        'Desc',
        [{ duration: 30, breakAfter: 0 }],
        false,
        Service.defaultHairLengthModifiers(),
        undefined,
        undefined,
        { start: '09:00', end: '' }
      );

      expect(service.validate()).toBe('Indica hora de inicio y fin del rango.');
    });
  });

  describe('materializeForLength()', () => {
    it('should create a new service with specific length segments', () => {
      const modifiers: HairLengthModifiers = {
        short: { time: 30, segments: [{ duration: 25, breakAfter: 5 }] },
        medium: { time: 45, segments: [{ duration: 40, breakAfter: 5 }] },
        long: { time: 60, segments: [{ duration: 55, breakAfter: 5 }] },
      };

      const service = new Service('Tinte', 'Coloración', [], true, modifiers);
      const materializedService = service.materializeForLength('medium');

      expect(materializedService.name).toBe('Tinte');
      expect(materializedService.timeSegments).toEqual([
        { duration: 40, breakAfter: 5 },
      ]);
      expect(materializedService.requiresHairLength).toBeFalse();
    });
  });

  describe('defaultHairLengthModifiers() - Static', () => {
    it('should return default modifiers', () => {
      const defaults = Service.defaultHairLengthModifiers();

      expect(defaults.short.time).toBe(30);
      expect(defaults.medium.time).toBe(45);
      expect(defaults.long.time).toBe(60);
    });
  });
});
