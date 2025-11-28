export interface BusinessStatus {
    isOpen: boolean;
    currentDay: string;
    openTime?: string;
    closeTime?: string;
    nextOpenDay?: string;
    nextOpenTime?: string;
    timeUntilChange?: string;
    isWarning?: boolean;
    warningType?: 'closing' | 'opening';
    remainingMinutes?: number;
    remainingSeconds?: number;
}
