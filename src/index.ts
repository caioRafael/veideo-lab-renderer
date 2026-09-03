import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, "assets", "input.png");
const audioPath = path.join(__dirname, "assets", "audio.mp3");
const outputPath = path.join(__dirname, "assets", "output.mp4");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const ffmpeg = spawn("ffmpeg", [
  "-y",
  "-loop",
  "1",
  "-i",
  inputPath,
  "-i",
  audioPath,
  "-vf",
  "scale=trunc(iw/2)*2:trunc(ih/2)*2",
  "-c:v",
  "libx264",
  "-c:a",
  "aac",
  "-t",
  "4",
  "-pix_fmt",
  "yuv420p",
  outputPath,
]);

ffmpeg.stdout.on("data", (data) => {
  console.log(data.toString());
});

ffmpeg.stderr.on("data", (data) => {
  console.error(data.toString());
});

ffmpeg.on("close", (code) => {
  console.log(`FFmpeg process exited with code ${code}`);
});
