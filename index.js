import express from "express";
import { spawn } from "child_process";

const app = express();

let ffmpegProcesses = {};
let viewers = {};
let viewerIntervals = {};

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

process.on("uncaughtException", (err) => {
  console.log("🔥 Error:", err);
});

process.on("unhandledRejection", (err) => {
  console.log("🔥 Rejection:", err);
});

app.get("/", (req, res) => {
  res.send("🚀 Restream System Running - 1080p Quality");
});

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
    
    "-i", channel.input,
    "-i", logo,
    
    "-filter_complex",
    "[0:v]scale=1920:1080,setsar=1[base];[base][1:v]overlay=W-w-5:5",
    
    "-c:v", "libx264",
    "-preset", "faster",
    "-tune", "zerolatency",
    "-b:v", "4500k",
    "-maxrate", "4500k",
    "-bufsize", "9000k",
    "-r", "30",
    
    "-c:a", "aac",
    "-b:a", "128k",
    
    "-f", "flv",
    channel.output
  ]);
  
  ffmpeg.stderr.on("data", (d) => {
    console.log(`[${id}] ${d.toString()}`);
  });
  
  ffmpeg.on("exit", (code) => {
    console.log(`❌ ${id} exited ${code}`);
    delete ffmpegProcesses[id];
    viewers[id] = 0;
    
    if (viewerIntervals[id]) {
      clearInterval(viewerIntervals[id]);
      delete viewerIntervals[id];
    }
  });
  
  ffmpegProcesses[id] = ffmpeg;
  
  viewers[id] = Math.floor(Math.random() * 10) + 3;
  
  if (viewerIntervals[id]) clearInterval(viewerIntervals[id]);
  
  viewerIntervals[id] = setInterval(() => {
    if (!viewers[id]) return;
    let change = Math.floor(Math.random() * 3) - 1;
    viewers[id] = Math.max(1, viewers[id] + change);
  }, 4000);
  
  res.send(`✅ Channel ${id} started (1080p @ 4.5Mbps)`);
});

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

app.get("/status", (req, res) => {
  const result = {};
  
  for (const id in channels) {
    result[id] = {
      active: !!ffmpegProcesses[id],
      viewers: viewers[id] || 0,
      quality: "1080p @ 4.5Mbps"
    };
  }
  
  res.json(result);
});

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
    .badge { background:#4CAF50; padding:3px 8px; border-radius:5px; font-size:12px; }
  </style>
</head>
<body>

<h2>📡 Live Dashboard <span class="badge">1080p HD</span></h2>

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
      "<h3>" + ch + " - " + (d.active ? '🟢 LIVE' : '🔴 OFFLINE') + "</h3>" +
      "<p>🎬 Quality: " + d.quality + "</p>" +
      "<p>👁️ Viewers: " + d.viewers + "</p>" +
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

app.get("/health", (req, res) => {
  res.send("OK");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("🚀 Server running on port", port);
  console.log("📺 Quality: 1080p @ 4.5Mbps | 30fps | 128kbps audio");
});
