import { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

import { TimerState } from "../timer/timer-types";

export class TimerWebSocketServer {
  private wss: WebSocketServer;

  constructor(
    server: Server,
    getTimerState: () => {
      state: TimerState;
      remainingMs: number;
    }
  ) {
    this.wss = new WebSocketServer({
      server,
      path: "/timer",
    });

    this.wss.on("connection", (socket) => {
      console.log("🌐 Timer website connected");

      const timer = getTimerState();

      console.log("📥 Sending current timer state:", timer);

      socket.send(
        JSON.stringify({
          type: "timer:update",
          state: {
            ...timer.state,
            remainingMs: timer.remainingMs,
          },
        })
      );

      socket.on("close", () => {
        console.log("🌐 Timer website disconnected");
      });
    });
  }

  broadcast(state: TimerState, remainingMs: number) {
    console.log(
      `📡 Broadcasting to ${this.wss.clients.size} WebSocket client(s)`
    );

    const message = JSON.stringify({
      type: "timer:update",
      state: {
        ...state,
        remainingMs,
      },
    });

    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  close() {
    this.wss.close();
  }
}