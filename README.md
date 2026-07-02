# WebRTC Remote Desktop

A real-time, peer-to-peer remote desktop application!

## Features
- Peer discovery
- WebRTC peer-to-peer connections
- Screen sharing
- Input event forwarding (mouse, keyboard)
- Performance HUD

## Run Locally
1. Install dependencies: `npm install`
2. Start backend: `npm run server`
3. In a separate terminal, start frontend: `npm run dev`
4. Open two browser tabs to `http://localhost:3000` to test!

## Deployment Options

### Option 1: Render (Free with Spin-Down)
1. Push code to GitHub
2. Go to [Render.com](https://render.com)
3. New Web Service → Connect repo
4. Use these settings:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Create Web Service!

⚠️ **Note**: Free instances spin down after inactivity, so peers won't be able to connect when it's asleep.

### Option 2: Railway (Free, No Spin-Down) ✨ BEST FREE OPTION
1. Push code to GitHub
2. Go to [Railway.app](https://railway.app)
3. New Project → Deploy from repo
4. Select your repo, click "Deploy"
5. Wait for it to build and deploy!

Railway's free tier doesn't spin down with inactivity! Perfect for this app!

### Option 3: Fly.io (Free Allowance)
1. Install [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
2. Run `fly launch` in project folder
3. Follow prompts to deploy!

## How It Works
- Backend: Express + Socket.io for signaling
- Frontend: React + Vite
- WebRTC for peer-to-peer audio/video/data
