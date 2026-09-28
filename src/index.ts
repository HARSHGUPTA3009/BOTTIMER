import dotenv from "dotenv";

dotenv.config();

import { createServer } from "http";

import {
  ChatInputCommandInteraction,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

import {
  formatDuration,
  parseDuration,
} from "./timer/timer-parser";

import { TimerManager } from "./timer/timer-manager";
import { TimerWebSocketServer } from "./server/websocket";

/* -------------------------
   Environment
------------------------- */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  throw new Error(
    "Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env"
  );
}

const DISCORD_TOKEN: string = TOKEN;
const DISCORD_CLIENT_ID: string = CLIENT_ID;
const DISCORD_GUILD_ID: string = GUILD_ID;

/* -------------------------
   Timer Manager
------------------------- */

const timer = new TimerManager();

/* -------------------------
   HTTP Server
------------------------- */

const httpServer = createServer(
  (_req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/plain",
    });

    res.end(
      "TheOGTimer backend is running."
    );
  }
);

/* -------------------------
   WebSocket Server
------------------------- */

const websocketServer =
  new TimerWebSocketServer(
    httpServer,
    () => ({
      state: timer.getState(),
      remainingMs: timer.getRemainingMs(),
    })
  );

timer.setExpirationHandler(() => {
  broadcastTimerState();
});
/* -------------------------
   Broadcast Timer State
------------------------- */

function broadcastTimerState() {
  websocketServer.broadcast(
    timer.getState(),
    timer.getRemainingMs()
  );
}

/* -------------------------
   Slash Commands
------------------------- */
// async function registerEntryPointCommand() {
//   const rest = new REST({
//     version: "10",
//   }).setToken(DISCORD_TOKEN);

//   console.log("Registering Activity Entry Point Command...");

//   await rest.post(
//     Routes.applicationCommands(DISCORD_CLIENT_ID),
//     {
//       body: {
//         name: "launch",
//         description: "Launch TheOGTimer",
//         type: 4,
//         handler: 2,
//         integration_types: [0],
//         contexts: [0, 1, 2],
//       },
//     }
//   );

//   console.log("Activity Entry Point Command registered.");
// }
const commands = [
  new SlashCommandBuilder()
    .setName("timer")
    .setDescription("Start a countdown timer")
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription(
          "Duration, e.g. 1:00:00, 25m, 90s"
        )
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("status")
    .setDescription(
      "Show the current timer status"
    ),

  new SlashCommandBuilder()
    .setName("pause")
    .setDescription(
      "Pause the current timer"
    ),

  new SlashCommandBuilder()
    .setName("resume")
    .setDescription(
      "Resume the paused timer"
    ),

  new SlashCommandBuilder()
    .setName("reset")
    .setDescription(
      "Reset the current timer"
    ),

  new SlashCommandBuilder()
    .setName("stop")
    .setDescription(
      "Stop the current timer"
    ),
].map((command) => command.toJSON());

/* -------------------------
   Register Commands
------------------------- */

async function registerCommands() {
  const rest = new REST({
    version: "10",
  }).setToken(DISCORD_TOKEN);

  console.log(
    "Registering slash commands..."
  );

  await rest.put(
    Routes.applicationGuildCommands(
      DISCORD_CLIENT_ID,
      DISCORD_GUILD_ID
    ),
    {
      body: commands,
    }
  );

  console.log(
    "Slash commands registered."
  );
}

/* -------------------------
   Discord Client
------------------------- */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
  ],
});

/* -------------------------
   Ready
------------------------- */

client.once("clientReady", () => {
  console.log(
    `Logged in as ${client.user?.tag}`
  );
});
/* -------------------------
   Interaction Handler
------------------------- */

client.on(
  "interactionCreate",
  async (interaction) => {
    if (
      !interaction.isChatInputCommand()
    ) {
      return;
    }

    try {
      switch (
        interaction.commandName
      ) {
        case "timer":
          await handleTimer(
            interaction
          );
          break;

        case "status":
          await handleStatus(
            interaction
          );
          break;

        case "pause":
          await handlePause(
            interaction
          );
          break;

        case "resume":
          await handleResume(
            interaction
          );
          break;

        case "reset":
          await handleReset(
            interaction
          );
          break;

        case "stop":
          await handleStop(
            interaction
          );
          break;
      }
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong.";

      if (interaction.replied) {
        await interaction.followUp({
          content: `❌ ${message}`,
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: `❌ ${message}`,
          ephemeral: true,
        });
      }
    }
  }
);

/* -------------------------
   /timer
------------------------- */

async function handleTimer(
  interaction: ChatInputCommandInteraction
) {
  const input =
    interaction.options.getString(
      "duration",
      true
    );

  const durationMs =
    parseDuration(input);

  if (
    durationMs === null ||
    durationMs <= 0
  ) {
    await interaction.reply({
      content:
        "❌ Invalid duration. Try `1:00:00`, `25m`, `90s`, or `1h`.",
      ephemeral: true,
    });

    return;
  }

  timer.start(durationMs);

  broadcastTimerState();
  

  await interaction.reply(
    `⏱️ Timer started: **${formatDuration(
      durationMs
    )}**`
  );

  console.log(
    `Timer started for ${formatDuration(
      durationMs
    )}`
  );
}

/* -------------------------
   /status
------------------------- */

async function handleStatus(
  interaction: ChatInputCommandInteraction
) {
  const state =
    timer.getState();

  if (
    state.status === "stopped"
  ) {
    await interaction.reply(
      "⏹️ No timer is currently running."
    );

    return;
  }

  const remaining =
    timer.getRemainingMs();

  if (remaining === 0) {
    await interaction.reply(
      "✅ Timer finished."
    );

    return;
  }

  const icon =
    state.status === "paused"
      ? "⏸️"
      : "▶️";

  await interaction.reply(
    `${icon} **${formatDuration(
      remaining
    )}** remaining.`
  );
}

/* -------------------------
   /pause
------------------------- */

async function handlePause(
  interaction: ChatInputCommandInteraction
) {
  const state =
    timer.pause();

  broadcastTimerState();

  await interaction.reply(
    `⏸️ Timer paused at **${formatDuration(
      state.pausedRemainingMs ?? 0
    )}** remaining.`
  );
}

/* -------------------------
   /resume
------------------------- */

async function handleResume(
  interaction: ChatInputCommandInteraction
) {
  const state =
    timer.resume();

  broadcastTimerState();

  await interaction.reply(
    `▶️ Timer resumed: **${formatDuration(
      state.endTime !== null
        ? state.endTime - Date.now()
        : 0
    )}** remaining.`
  );
}

/* -------------------------
   /reset
------------------------- */

async function handleReset(
  interaction: ChatInputCommandInteraction
) {
  timer.reset();

  broadcastTimerState();

  await interaction.reply(
    "🔄 Timer has been reset."
  );
}

/* -------------------------
   /stop
------------------------- */

async function handleStop(
  interaction: ChatInputCommandInteraction
) {
  timer.stop();

  broadcastTimerState();

  await interaction.reply(
    "⏹️ Timer stopped."
  );
}

/* -------------------------
   Start
------------------------- */

async function start() {
  await registerCommands();
  // await registerEntryPointCommand();

  httpServer.listen(3000, () => {
    console.log(
      "HTTP/WebSocket server running on port 3000"
    );
  });

  await client.login(DISCORD_TOKEN);
}

start().catch(console.error);