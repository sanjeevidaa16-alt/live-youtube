# CastLoop 24/7 — Production YouTube RTMP Video Loop Streamer

CastLoop is a web application designed to run continuous, uninterrupted 24×7 video loop live streams directly to YouTube Live (or any RTMP ingest server) using an independent server-side FFmpeg engine.

Unlike browser-based WebRTC or canvas solutions, **CastLoop streams directly from the backend server**. You can safely disconnect, close your browser, or reboot your client without interrupting the active YouTube stream.

---

## 🌟 Key Features

1. **Independent Server-Side FFmpeg Engine**
   - Video transcoding and looping happen directly on the Node.js / Linux host.
   - Stream continues broadcasting 24 hours a day, 7 days a week.
   - Closing or refreshing the browser has **zero impact** on stream uptime.

2. **Seamless Infinite Looping**
   - Leverages native FFmpeg `-stream_loop -1` to replay videos infinitely without dropping connection or timestamp sync.
   - Automatic synthetic AAC audio track generation for silent videos to ensure strict YouTube Live audio requirements are satisfied.

3. **Real-Time Telemetry & Console**
   - Live Server-Sent Events (SSE) stream for instantaneous log streaming and encoder statistics (`fps`, `bitrate`, `speed`, `q-factor`, `frames`, `uptime`).
   - Interactive terminal viewer with keyword filtering, log level coloring, and TXT export.

4. **Crash Recovery & Auto-Reconnect**
   - Automatic reconnect handler when network blips or RTMP socket drops occur.
   - Automatic stream state recovery on server restart / container reboot.

5. **Video Asset Manager**
   - Drag-and-drop video upload with upload progress indication.
   - Automated FFprobe metadata extraction (duration, resolution, fps, codecs, audio presence).
   - Automated video thumbnail extraction.
   - Embedded HTML5 preview player.

6. **Enterprise Security & Protection**
   - JWT-based authentication with bcrypt-like credential hashing.
   - Stream keys are encrypted on the server and sanitized from all logs and SSE payloads.
   - Rate limiting on API endpoints to prevent brute-force attacks.

---

## 🚀 Quick Start (Docker)

The fastest way to deploy CastLoop in production is with Docker:

```bash
# Clone the repository
git clone https://github.com/your-repo/castloop.git
cd castloop

# Start with Docker Compose
docker-compose up -d --build
```

Access the web dashboard at `http://localhost:3000`.

**Default Login Credentials:**
- **Username:** `admin`
- **Password:** `adminpassword123` *(Change this in Settings after logging in)*

---

## 🛠️ Manual Installation (Ubuntu / Debian / VPS)

### 1. Install System Prerequisites

Ensure Node.js 20+ and FFmpeg are installed on your host:

```bash
sudo apt update
sudo apt install -y ffmpeg nodejs npm
ffmpeg -version
```

### 2. Install Project Dependencies & Build

```bash
npm install
npm run build
```

### 3. Start Production Server

```bash
npm start
```

For persistent background execution on a VPS, use PM2:

```bash
npm install -g pm2
pm2 start dist/server.cjs --name "castloop-streamer"
pm2 save
pm2 startup
```

---

## ⚙️ FFmpeg Command Architecture

CastLoop uses an optimized FFmpeg command configuration for YouTube Live:

```bash
ffmpeg -re -stream_loop -1 -i /path/to/video.mp4 \
  -c:v libx264 -preset veryfast -b:v 4000k -maxrate 4000k -bufsize 8000k \
  -pix_fmt yuv420p -g 60 -keyint_min 60 -r 30 \
  -c:a aac -b:a 128k -ar 44100 \
  -f flv rtmp://a.rtmp.youtube.com/live2/{STREAM_KEY}
```

- **`-re`**: Read input at native framerate (essential for real-time live streaming).
- **`-stream_loop -1`**: Infinite input loop.
- **`-g 60` / `-keyint_min 60`**: 2-second keyframe interval as mandated by YouTube Live.
- **`-pix_fmt yuv420p`**: Standard YUV 4:2:0 chroma subsampling for compatibility.
- **`-f flv`**: Flash Video RTMP container format.

---

## 🔒 Security

- **Stream Keys:** Never sent to client-side logs or exposed in browser storage.
- **API Authentication:** Protected by JWT tokens in `Authorization: Bearer <token>`.
- **Database:** Atomic write operations prevent database corruption during sudden power losses.
