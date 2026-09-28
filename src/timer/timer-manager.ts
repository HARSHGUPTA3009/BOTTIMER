import { TimerState, TimerStatus } from "./timer-types";

export class TimerManager {
  private status: TimerStatus = "stopped";
  private endTime: number | null = null;
  private pausedRemainingMs: number | null = null;

  private expirationTimer: ReturnType<typeof setTimeout> | null = null;

  private expirationHandler: (() => void) | null = null;

  setExpirationHandler(handler: () => void) {
    this.expirationHandler = handler;
  }

  start(durationMs: number): TimerState {
    if (durationMs <= 0) {
      throw new Error(
        "Duration must be greater than zero."
      );
    }

    this.clearExpirationTimer();

    this.status = "running";
    this.endTime = Date.now() + durationMs;
    this.pausedRemainingMs = null;

    this.scheduleExpiration(durationMs);

    return this.getState();
  }

  pause(): TimerState {
    if (
      this.status !== "running" ||
      this.endTime === null
    ) {
      throw new Error(
        "There is no running timer to pause."
      );
    }

    this.pausedRemainingMs = Math.max(
      0,
      this.endTime - Date.now()
    );

    this.clearExpirationTimer();

    this.endTime = null;
    this.status = "paused";

    return this.getState();
  }

  resume(): TimerState {
    if (
      this.status !== "paused" ||
      this.pausedRemainingMs === null
    ) {
      throw new Error(
        "There is no paused timer to resume."
      );
    }

    const remainingMs =
      this.pausedRemainingMs;

    this.endTime =
      Date.now() + remainingMs;

    this.pausedRemainingMs = null;
    this.status = "running";

    this.scheduleExpiration(remainingMs);

    return this.getState();
  }

  reset(): TimerState {
    this.clearExpirationTimer();

    this.status = "stopped";
    this.endTime = null;
    this.pausedRemainingMs = null;

    return this.getState();
  }

  stop(): TimerState {
    this.clearExpirationTimer();

    this.status = "stopped";
    this.endTime = null;
    this.pausedRemainingMs = null;

    return this.getState();
  }

  getState(): TimerState {
    return {
      status: this.status,
      endTime: this.endTime,
      pausedRemainingMs:
        this.pausedRemainingMs,
    };
  }

  getRemainingMs(): number {
    if (
      this.status === "paused" &&
      this.pausedRemainingMs !== null
    ) {
      return this.pausedRemainingMs;
    }

    if (
      this.status === "running" &&
      this.endTime !== null
    ) {
      return Math.max(
        0,
        this.endTime - Date.now()
      );
    }

    return 0;
  }

  private scheduleExpiration(
    durationMs: number
  ) {
    this.clearExpirationTimer();

    this.expirationTimer = setTimeout(() => {
      this.expire();
    }, durationMs);
  }

  private expire() {
    this.clearExpirationTimer();

    this.status = "stopped";
    this.endTime = null;
    this.pausedRemainingMs = null;

    console.log("⏰ Timer finished");

    this.expirationHandler?.();
  }

  private clearExpirationTimer() {
    if (this.expirationTimer !== null) {
      clearTimeout(this.expirationTimer);
      this.expirationTimer = null;
    }
  }
}