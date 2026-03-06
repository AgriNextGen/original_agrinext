import { execFileSync } from "node:child_process";

const DEFAULT_PORT = 5173;
const RETRY_COUNT = 8;
const RETRY_DELAY_MS = 300;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = (error.stderr ?? "").toString().trim();
    const stdout = (error.stdout ?? "").toString().trim();
    const details = stderr || stdout;
    throw new Error(
      `[dev preflight] ${command} ${args.join(" ")} failed${details ? `: ${details}` : ""}`,
    );
  }
}

function parsePort(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`[dev preflight] Invalid DEV_PORT value: "${value}"`);
  }
  return parsed;
}

function addressMatchesPort(address, port) {
  const match = address.match(/:(\d+)$/);
  if (!match) return false;
  return Number(match[1]) === port;
}

function getListeningPids(port) {
  const output = run("netstat", ["-ano", "-p", "tcp"]);
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("TCP")) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length < 5) continue;

    const localAddress = parts[1];
    const state = parts[3];
    const pid = Number(parts[4]);

    if (state !== "LISTENING") continue;
    if (!Number.isInteger(pid) || pid <= 0) continue;
    if (addressMatchesPort(localAddress, port)) {
      pids.add(pid);
    }
  }

  return [...pids];
}

async function waitUntilPortIsFree(port) {
  for (let i = 0; i < RETRY_COUNT; i += 1) {
    const pids = getListeningPids(port);
    if (pids.length === 0) {
      return true;
    }
    await sleep(RETRY_DELAY_MS);
  }
  return false;
}

async function main() {
  const port = parsePort(process.env.DEV_PORT ?? String(DEFAULT_PORT));

  if (process.platform !== "win32") {
    console.log(`[dev preflight] Non-Windows host detected. Skipping port cleanup for ${port}.`);
    return;
  }

  const pids = getListeningPids(port);
  if (pids.length === 0) {
    console.log(`[dev preflight] Port ${port} is free.`);
    return;
  }

  console.warn(
    `[dev preflight] Port ${port} is in use by PID(s): ${pids.join(", ")}. Stopping them...`,
  );

  for (const pid of pids) {
    try {
      run("taskkill", ["/PID", String(pid), "/F", "/T"]);
    } catch (error) {
      throw new Error(
        `${error.message}\n[dev preflight] Manual recovery:\n` +
          `  netstat -ano | findstr LISTENING | findstr ":${port}"\n` +
          "  Stop-Process -Id <PID> -Force",
      );
    }
  }

  const isFree = await waitUntilPortIsFree(port);
  if (!isFree) {
    const remaining = getListeningPids(port);
    throw new Error(
      `[dev preflight] Port ${port} is still in use after cleanup. Remaining PID(s): ${remaining.join(", ")}\n` +
        "[dev preflight] Manual recovery:\n" +
        `  netstat -ano | findstr LISTENING | findstr ":${port}"\n` +
        "  Stop-Process -Id <PID> -Force",
    );
  }

  console.log(`[dev preflight] Port ${port} is now free.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
