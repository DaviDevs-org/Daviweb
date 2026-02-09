export interface StrikeEvent {
    date: Date;
    reason: string;
}

export class AttendanceRecord {
    constructor(
        public phone: string,
        public strikeCount: number,
        public lastStrike: Date,
        public history: StrikeEvent[] = []
    ) {}
}
