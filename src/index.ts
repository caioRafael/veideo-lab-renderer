import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildCommand,
  formatFfmpegCommand,
} from "./ffmpeg/buildCommand";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "assets");
const defaultCompositionPath = path.join(
  __dirname,
  "compositions",
  "example.json",
);

const compositionArg = process.argv
  .slice(2)
  .find((arg) => arg !== "--");

const compositionPath = path.resolve(
  compositionArg ?? defaultCompositionPath,
);
const composition = JSON.parse(fs.readFileSync(compositionPath, "utf8"));
const args = buildCommand({ composition, assetsDir });

console.log("Composition:", compositionPath);
console.log("FFmpeg command:");
console.log(formatFfmpegCommand(args));
console.log("");

const ffmpeg = spawn("ffmpeg", args);

ffmpeg.stdout.on("data", (data) => {
  console.log(data.toString());
});

ffmpeg.stderr.on("data", (data) => {
  console.error(data.toString());
});

ffmpeg.on("close", (code) => {
  console.log(`FFmpeg process exited with code ${code}`);
  process.exitCode = code ?? 1;
});
