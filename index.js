import express from "express";
import { spawn } from "child_process";

const app = express();

let ffmpegProcesses = {};

// 👁️ عداد مشاهدين (محسن بدل fake ثابت)
let viewers = {};
let viewerIntervals = {};

// 🎯 القنوات
const channels = {
  ch1: {
    input: "http://rgkkw.live/live/akheelasharaf/97430689947/744523.ts",
    output: "rtmp://rtmp.livepeer.com/live/7d8c-1z1h-x9wv-ijnn"
  },

  ch2: {
    input: "http://rgkkw.live/live/akheelasharaf/97430689947/744524.ts",
    output: "rtmp://rtmp.livepeer.com/live/6a40-x3zs-p34r-ueay"
  },

  ch3: {
    input: "http://rgkkw.live/live/akheelasharaf/97430689947/744525.ts",
    output: "rtmp://rtmp.livepeer.com/live/314d-wmn0-05vr-2vtl"
  },

  ch4: {
    input: "http://rgkkw.live/live/akheelasharaf/97430689947/744526.ts",
    output: "rtmp://rtmp.livepeer.com/live/ad31-vdct-dexe-l6b8"
  },

  ch5: {
    input: "http://rgkkw.live/live/akheelasharaf/97430689947/744527.ts",
    output: "rtmp://rtmp.livepeer.com/live/6e74-mu1u-0a68-qlrk"
  }
};

// 🎯 لوجو لكل قناة
const logos = {
  ch1: "logo1.png",
  ch2: "logo2.png",
  ch3: "logo3.png",
  ch4: "logo4.png",
  ch5: "logo5.png",
};

function getLogo(id) {
  return logos[id] || "logo.png";
}

// 🛡️ حماية
process.on("uncaughtException", (err) => {
  console.log("🔥 Error:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("🔥 Rejection:", err);
});

// 🌐 Home
app.get("/", (req, res) => {
  res.send("🚀 Restream System Running FINAL (1080p Quality)");
});

// ▶️ Start Stream
app.get("/start", (req, res) => {
  const id = req.query.id;

  if (!id) return res.send("❌ missing id");

  const channel = channels[id];
  if (!channel) return res.send("❌ channel not found");

  if (ffmpegProcesses[id]) {
    return res.send("⚠️ already running");
  }

  const logo = getLogo(id);

  const ffmpeg = spawn("ffmpeg", [
    "-re",
    "-fflags", "+genpts+discardcorrupt",
    "-flags", "low_delay",
    
    // Input filters to improve quality
    "-vsync", "0",
    "-hwaccel", "auto",

    "-i", channel.input,
    "-i", logo,

    // 1080p filter with better scaling algorithm
    "-filter_complex",
    "[0:v]scale=1920:1080:flags=lanczos,setsar=1,fps=30[base];[base][1:v]overlay=W-w-10:H-h-10:format=auto",

    // Video codec with high quality settings
    "-c:v", "libx264",
    "-preset", "medium",        // Better quality than veryfast
    "-tune", "zerolatency",
    "-profile:v", "high",       // High profile for 1080p
    "-level", "4.1",           // Level for 1080p30
    
    // Higher bitrate for 1080p
    "-b:v", "4500k",           // Increased from 1200k
    "-maxrate", "6000k",       // Max bitrate
    "-bufsize", "9000k",       // Buffer size
    
    // Quality parameters
    "-crf", "23",              // Constant Rate Factor
    "-x264-params", "keyint=60:min-keyint=30:scenecut=40",
    
    // Frame rate for 1080p
    "-r", "30",                // Increased from 25 to 30 fps
    
    // Audio settings (improved)
    "-c:a", "aac",
    "-b:a", "128k",            // Increased from 96k
    "-ar", "44100",            // Sample rate
    
    // Output format
    "-f", "flv",
    "-flvflags", "no_duration_filesize",
    
    channel.output
  ]);

  ffmpeg.stderr.on("data", (d) => {
    console.log(`[${id}] ${d.toString()}`);
  });

  ffmpeg.on("exit", (code) => {
    console.log(`❌ ${id} exited ${code}`);
    delete ffmpegProcesses[id];

    // 🧹 تنظيف العدّاد
    viewers[id] = 0;

    if (viewerIntervals[id]) {
      clearInterval(viewerIntervals[id]);
      delete viewerIntervals[id];
    }
  });

  ffmpegProcesses[id] = ffmpeg;

  // 👁️ init viewers
  viewers[id] = Math.floor(Math.random() * 10) + 3;

  // 🔥 حركة مشاهدة واقعية
  if (viewerIntervals[id]) clearInterval(viewerIntervals[id]);

  viewerIntervals[id] = setInterval(() => {
    if (!viewers[id]) return;

    let change = Math.floor(Math.random() * 3) - 1; // -1 0 +1
    viewers[id] = Math.max(1, viewers[id] + change);

  }, 4000);

  res.send(`✅ Channel ${id} started (1080p 4.5Mbps)`);
});

// 🛑 Stop Stream
app.get("/stop", (req, res) => {
  const id = req.query.id;

  if (ffmpegProcesses[id]) {
    ffmpegProcesses[id].kill("SIGKILL");
    delete ffmpegProcesses[id];
  }

  viewers[id] = 0;

  if (viewerIntervals[id]) {
    clearInterval(viewerIntervals[id]);
    delete viewerIntervals[id];
  }

  res.send(`🛑 Channel ${id} stopped`);
});

// 📊 Status
app.get("/status", (req, res) => {
  const result = {};

  for (const id in channels) {
    result[id] = {
      active: !!ffmpegProcesses[id],
      viewers: viewers[id] || 0,
      quality: "1080p"
    };
  }

  res.json(result);
});

// 📡 Dashboard
app.get("/dashboard", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard 1080p</title>
  <style>
    body { font-family: Arial; background:#111; color:#fff; padding:20px; }
    .card { background:#222; padding:15px; margin:10px 0; border-radius:10px; }
    button { padding:8px 12px; margin:5px; cursor:pointer; }
    .quality-badge { background:#4CAF50; padding:2px 8px; border-radius:5px; font-size:12px; }
  </style>
</head>
<body>

<h2>📡 Live Dashboard <span style="font-size:14px;" class="quality-badge">1080p Full HD</span></h2>

<div id="list"></div>

<script>

async function load() {
  const res = await fetch('/status');
  const data = await res.json();

  const box = document.getElementById('list');
  box.innerHTML = '';

  Object.keys(data).forEach(ch => {
    const d = data[ch];

    box.innerHTML += "<div class='card'>" +
      "<h3>" + ch.toUpperCase() + " - " + (d.active ? '🟢 LIVE' : '🔴 OFFLINE') + " <span class='quality-badge'>" + d.quality + "</span></h3>" +
      "<p>👁️ Viewers: " + d.viewers + "</p>" +
      "<p>🎬 Quality: 1920x1080 @ 4.5 Mbps</p>" +
      "<a href='/start?id=" + ch + "'><button style='background:green;color:white;'>Start</button></a>" +
      "<a href='/stop?id=" + ch + "'><button style='background:red;color:white;'>Stop</button></a>" +
      "</div>";
  });
}

load();
setInterval(load, 3000);

</script>

</body>
</html>
  `);
});

// 🚀 Health check
app.get("/health", (req, res) => {
  res.send("OK");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("🚀 Server running on port", port);
  console.log("📺 Streaming at 1080p (1920x1080) with 4.5 Mbps bitrate");
});
