export type TimerStatus = "running" | "paused" | "stopped";

export interface TimerState {
  status: TimerStatus;
  endTime: number | null;
  pausedRemainingMs: number | null;
}