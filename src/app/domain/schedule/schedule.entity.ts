export interface Interval {
  open: string;
  close: string;
  blocked?: boolean;
}

export interface ScheduleDay {
  day: string;
  name: string;
  closed: boolean;
  intervals: Interval[];
}
