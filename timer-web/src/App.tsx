import { useEffect, useMemo, useState } from "react";
import { patchUrlMappings } from "@discord/embedded-app-sdk";

import "./App.css";

type TimerStatus = "running" | "paused" | "stopped";

interface TimerUpdate {
  type: "timer:update";
  state: {
    status: TimerStatus;
    endTime: number | null;
    pausedRemainingMs: number | null;
    remainingMs: number;
  };
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function App() {
  const [status, setStatus] = useState<TimerStatus>("stopped");
  const [endTime, setEndTime] = useState<number | null>(null);
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(
    null
  );
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    let socketUrl: string;

    if (isLocal) {
      socketUrl = "ws://localhost:3000/timer";
    } else {
      patchUrlMappings([
        {
          prefix: "/timer",
          target: "prostate-jim-poison-technical.trycloudflare.com",
        },
      ]);

      socketUrl =
        "wss://prostate-jim-poison-technical.trycloudflare.com/timer";
    }

    console.log("Connecting to WebSocket:", socketUrl);

    const socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      console.log("WebSocket connected.");
    };

    socket.onmessage = (event) => {
      try {
        const message: TimerUpdate = JSON.parse(event.data);

        if (message.type !== "timer:update") {
          return;
        }

        const { state } = message;

        setStatus(state.status);
        setEndTime(state.endTime);
        setPausedRemainingMs(state.pausedRemainingMs);
        setRemainingMs(state.remainingMs);
      } catch (error) {
        console.error("Failed to parse timer message:", error);
      }
    };

    socket.onerror = () => {
      console.error("WebSocket connection failed.");
    };

    socket.onclose = () => {
      console.log("WebSocket disconnected.");
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    if (status !== "running" || endTime === null) {
      return;
    }

    const interval = window.setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());

      setRemainingMs(remaining);

      if (remaining === 0) {
        setStatus("stopped");
        setEndTime(null);
        setPausedRemainingMs(null);
      }
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [status, endTime]);

  const displayedTime =
    status === "paused"
      ? formatTime(pausedRemainingMs ?? 0)
      : formatTime(remainingMs);

  const statusText = useMemo(() => {
    switch (status) {
      case "running":
        return "Timer running";

      case "paused":
        return "Timer paused";

      default:
        return "Ready when you are";
    }
  }, [status]);

  const progress = useMemo(() => {
    if (status === "stopped" || remainingMs <= 0) {
      return 0;
    }

    return 1;
  }, [status, remainingMs]);

  return (
    <main className="timer-app">
      <div className="background-glow glow-one" />
      <div className="background-glow glow-two" />

      <section className="timer-card">
        <header className="timer-header">
          <div className="brand">
            <div className="brand-icon">⏱</div>

            <div>
              <h1>TheOGTimer</h1>
              <p>Discord Activity</p>
            </div>
          </div>

          <div className={`status-pill ${status}`}>
            <span className="status-dot" />
            {status}
          </div>
        </header>

        <div className={`timer-display ${status}`}>
          <div className="timer-ring">
            <div className="timer-ring-inner">
              <span className="timer-label">
                {status === "running"
                  ? "TIME REMAINING"
                  : status === "paused"
                  ? "PAUSED"
                  : "READY"}
              </span>

              <span className="timer-value">{displayedTime}</span>

              <span className="timer-status">{statusText}</span>
            </div>
          </div>
        </div>

        <div className="progress-container">
          <div className="progress-track">
            <div
              className="progress-bar"
              style={{
                transform: `scaleX(${progress})`,
              }}
            />
          </div>
        </div>

        <footer className="timer-footer">
          <div>
            <span className="footer-label">STATUS</span>
            <span className="footer-value">
              {status === "running"
                ? "Counting down"
                : status === "paused"
                ? "Paused"
                : "Waiting for timer"}
            </span>
          </div>

          <div className="command-hint">
            <span>/timer</span>
            <span>to start</span>
          </div>
        </footer>
      </section>
    </main>
  );
}

export default App;