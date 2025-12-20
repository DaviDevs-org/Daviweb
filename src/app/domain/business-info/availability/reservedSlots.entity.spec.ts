import { ReservedSlot, ReservedSlotDTO } from './reservedSlots.entity';

describe('ReservedSlot Entity', () => {
  describe('Constructor', () => {
    it('should create a reserved slot with valid data', () => {
      const dateTime = new Date('2025-01-15T10:30:00');
      const slot = new ReservedSlot('apt-123', dateTime);

      expect(slot.appointmentId).toBe('apt-123');
      expect(slot.dateTime).toEqual(dateTime);
      expect(slot.id).toBeUndefined();
    });

    it('should create a reserved slot with ID', () => {
      const dateTime = new Date('2025-01-15T10:30:00');
      const slot = new ReservedSlot('apt-123', dateTime, 'slot-456');

      expect(slot.id).toBe('slot-456');
    });

    it('should extract date in ISO format (YYYY-MM-DD)', () => {
      const dateTime = new Date('2025-06-20T14:45:00');
      const slot = new ReservedSlot('apt-123', dateTime);

      expect(slot.date).toBe('2025-06-20');
    });

    it('should extract time in HH:mm format with padding', () => {
      const dateTime = new Date('2025-01-15T09:05:00');
      const slot = new ReservedSlot('apt-123', dateTime);

      expect(slot.time).toBe('09:05');
    });

    it('should handle afternoon times correctly', () => {
      const dateTime = new Date('2025-01-15T16:30:00');
      const slot = new ReservedSlot('apt-123', dateTime);

      expect(slot.time).toBe('16:30');
    });

    it('should handle midnight correctly', () => {
      const dateTime = new Date('2025-01-15T00:00:00');
      const slot = new ReservedSlot('apt-123', dateTime);

      expect(slot.time).toBe('00:00');
    });

    it('should handle end of day correctly', () => {
      const dateTime = new Date('2025-01-15T23:59:00');
      const slot = new ReservedSlot('apt-123', dateTime);

      expect(slot.time).toBe('23:59');
    });

    it('should convert non-Date dateTime to Date', () => {
      // Simulate receiving a timestamp or string
      const slot = new ReservedSlot('apt-123', '2025-01-15T10:30:00' as any);

      expect(slot.dateTime).toBeInstanceOf(Date);
    });

    it('should handle invalid dateTime by defaulting to now', () => {
      const consoleSpy = spyOn(console, 'error');
      const slot = new ReservedSlot('apt-123', 'invalid-date' as any);

      expect(consoleSpy).toHaveBeenCalled();
      expect(slot.dateTime).toBeInstanceOf(Date);
      expect(isNaN(slot.dateTime.getTime())).toBeFalse();
    });
  });

  describe('toDTO()', () => {
    it('should convert slot to DTO', () => {
      const dateTime = new Date('2025-01-15T10:30:00');
      const slot = new ReservedSlot('apt-123', dateTime, 'slot-456');

      const dto = slot.toDTO();

      expect(dto.appointmentId).toBe('apt-123');
      expect(dto.dateTime).toEqual(dateTime);
      expect(dto.createdAt).toBeInstanceOf(Date);
    });

    it('should set createdAt to current time', () => {
      const before = new Date();
      const slot = new ReservedSlot('apt-123', new Date());
      const dto = slot.toDTO();
      const after = new Date();

      expect(dto.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(dto.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('fromDTO() - Static Factory', () => {
    it('should create ReservedSlot from DTO with Date', () => {
      const dto: ReservedSlotDTO & { id?: string } = {
        appointmentId: 'apt-789',
        dateTime: new Date('2025-02-20T14:00:00'),
        createdAt: new Date(),
        id: 'slot-abc',
      };

      const slot = ReservedSlot.fromDTO(dto);

      expect(slot.appointmentId).toBe('apt-789');
      expect(slot.dateTime).toEqual(dto.dateTime);
      expect(slot.id).toBe('slot-abc');
    });

    it('should handle Firestore Timestamp-like object with toDate()', () => {
      const mockTimestamp = {
        toDate: () => new Date('2025-02-20T14:00:00'),
      };

      const dto = {
        appointmentId: 'apt-789',
        dateTime: mockTimestamp as any,
        createdAt: new Date(),
      };

      const slot = ReservedSlot.fromDTO(dto);

      expect(slot.dateTime).toEqual(new Date('2025-02-20T14:00:00'));
    });

    it('should handle raw timestamp string', () => {
      const dto = {
        appointmentId: 'apt-789',
        dateTime: '2025-02-20T14:00:00' as any,
        createdAt: new Date(),
      };

      const slot = ReservedSlot.fromDTO(dto);

      expect(slot.dateTime).toBeInstanceOf(Date);
      expect(slot.dateTime.getTime()).toBe(
        new Date('2025-02-20T14:00:00').getTime()
      );
    });

    it('should create slot without ID when not provided', () => {
      const dto: ReservedSlotDTO = {
        appointmentId: 'apt-789',
        dateTime: new Date('2025-02-20T14:00:00'),
        createdAt: new Date(),
      };

      const slot = ReservedSlot.fromDTO(dto);

      expect(slot.id).toBeUndefined();
    });
  });

  describe('Date and Time Extraction', () => {
    it('should handle year boundary correctly', () => {
      const slot = new ReservedSlot(
        'apt-123',
        new Date('2025-12-31T23:30:00')
      );

      expect(slot.date).toBe('2025-12-31');
      expect(slot.time).toBe('23:30');
    });

    it('should handle month with single digit correctly', () => {
      const slot = new ReservedSlot('apt-123', new Date('2025-03-05T08:00:00'));

      expect(slot.date).toBe('2025-03-05');
    });

    it('should handle first day of month', () => {
      const slot = new ReservedSlot('apt-123', new Date('2025-01-01T12:00:00'));

      expect(slot.date).toBe('2025-01-01');
    });
  });

  describe('Edge Cases', () => {
    it('should handle standard slot times (30 min intervals)', () => {
      const slot1 = new ReservedSlot('apt-1', new Date('2025-01-15T09:00:00'));
      const slot2 = new ReservedSlot('apt-2', new Date('2025-01-15T09:30:00'));
      const slot3 = new ReservedSlot('apt-3', new Date('2025-01-15T10:00:00'));

      expect(slot1.time).toBe('09:00');
      expect(slot2.time).toBe('09:30');
      expect(slot3.time).toBe('10:00');
    });

    it('should handle multiple slots for same appointment', () => {
      const slot1 = new ReservedSlot(
        'apt-123',
        new Date('2025-01-15T10:00:00'),
        'slot-1'
      );
      const slot2 = new ReservedSlot(
        'apt-123',
        new Date('2025-01-15T10:30:00'),
        'slot-2'
      );
      const slot3 = new ReservedSlot(
        'apt-123',
        new Date('2025-01-15T11:00:00'),
        'slot-3'
      );

      expect(slot1.appointmentId).toBe(slot2.appointmentId);
      expect(slot2.appointmentId).toBe(slot3.appointmentId);
      expect(slot1.time).toBe('10:00');
      expect(slot2.time).toBe('10:30');
      expect(slot3.time).toBe('11:00');
    });

    it('should maintain date consistency across time zones', () => {
      // Using UTC time explicitly
      const dateTime = new Date('2025-06-15T10:00:00');
      const slot = new ReservedSlot('apt-123', dateTime);

      // The date and time should match the local interpretation
      expect(slot.dateTime.getHours()).toBe(dateTime.getHours());
      expect(slot.dateTime.getMinutes()).toBe(dateTime.getMinutes());
    });
  });
});
