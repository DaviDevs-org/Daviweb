export interface Strike {
  id?: string;               // ID del documento en la subcolección
  date: Date;                // Fecha de registro del strike
  appointmentDate?: Date;    // Fecha original de la cita (para reporting y link al calendario)
  reason?: string;           // Observación específica de ESA falta
  appointmentId?: string;    // ID de la cita asociada
  justified?: boolean;       // Si luego se marcó como justificada
}

export class BlacklistEntry {
  constructor(
    public phone: string,
    public isBlocked: boolean = false,
    public strikeCount: number = 0, // número total de faltas
    public reason?: string,         // nota general del bloqueo
    public alias?: string,          // nombre/apodo para identificar ese número
    public lastStrikeDate?: Date,   // fecha de la última falta
    public blockedAt?: Date,        // cuándo se bloqueó, si está bloqueado
  ) {}
}
