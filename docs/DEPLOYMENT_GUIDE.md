# Jetpack Arena — Hosting & Multiplayer Guide

Here are 3 ways to host and play **Jetpack Arena** with friends:

---

## Option 1: Instant Public Link (Play with Friends in 30 Seconds)

You can generate a temporary public HTTPS link directly from your computer so anyone in the world can join over the internet without setting up a server:

### Step 1: Ensure the game server is running
In one terminal:
```bash
npm start
```
*(Server will start on port 3000)*

### Step 2: Open a public tunnel
In a second terminal, run:
```bash
npx localtunnel --port 3000
```
It will output a live HTTPS URL, for example:
```text
your url is: https://jetpack-brave-hero.loca.lt
```

### Step 3: Share with friends
1. Send the URL to your friends.
2. When prompted on the first visit to enter the public IP password, you can check your IP at [ipv4.icanhazip.com](https://ipv4.icanhazip.com) and paste it.
3. Create a room, click **SHARE LINK**, and play!

---

## Option 2: Local Wi-Fi / Hotspot (Play on Phones & Laptops in the Same House)

Zero internet latency, perfect for playing with friends or family on the same Wi-Fi network:

1. **Find your Wi-Fi IP address**:
   - Your computer's current local IP is: **`192.168.1.15`**
2. **Start the game**:
   ```bash
   npm start
   ```
3. **Open on phones and other computers**:
   - On any phone, tablet, or laptop connected to your Wi-Fi, open Safari or Chrome and navigate to:
     ```text
     http://192.168.1.15:3000
     ```
4. Create a room on one device and join with the 5-letter room code on the others!

---

## Option 3: Permanent 24/7 Cloud Hosting (Render — 100% Free)

Deploy a permanent, public web address (e.g. `https://jetpack-arena.onrender.com`) that stays online 24/7:

### Step 1: Push project to GitHub
1. Create a new GitHub repository (e.g. `jetpack-arena`).
2. Run in your terminal:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/jetpack-arena.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Render.com
1. Go to [render.com](https://render.com) and log in with GitHub.
2. Click **New +** &rarr; **Web Service**.
3. Select your `jetpack-arena` repository.
4. Render will automatically detect the included `render.yaml` configuration:
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
5. Click **Deploy Web Service**!
6. In ~2 minutes, Render gives you a live permanent public URL with full WebSocket support!

---

## Option 4: Deploy with Docker (Railway / Fly.io / VPS)

The project includes an optimized production `Dockerfile`:

### Railway:
1. Go to [railway.app](https://railway.app).
2. Click **New Project** &rarr; **Deploy from GitHub repo**.
3. Railway automatically detects the `Dockerfile` and deploys it live.

### Self-Hosted VPS:
```bash
docker build -t jetpack-arena .
docker run -d -p 3000:3000 --name jetpack-arena jetpack-arena
```
