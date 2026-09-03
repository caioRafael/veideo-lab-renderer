import { spawn } from "node:child_process";

const process = spawn("ffmpeg", [
  "-y",
  "-loop",
  "1",
  "-i",
  "src/assets/input.png",
  "-vf",
  "scale=trunc(iw/2)*2:trunc(ih/2)*2",
  "-c:v",
  "libx264",
  "-t",
  "4",
  "-pix_fmt",
  "yuv420p",
  "output.mp4",
]);

process.stdout.on("data", (data) => {
  console.log(data.toString());
});

process.stderr.on("data", (data) => {
  console.error(data.toString());
});

process.on("close", (code) => {
  console.log(`FFmpeg process exited with code ${code}`);
});