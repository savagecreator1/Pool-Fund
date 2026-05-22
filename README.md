# PoolFund — Deployment Guide

## What's in this folder

```
poolfund-deploy/
├── index.html          ← Entry point with SEO meta tags + favicon
├── package.json        ← Dependencies (React + Vite)
├── vite.config.js      ← Build config
├── vercel.json         ← Single-page app routing for Vercel
└── src/
    ├── main.jsx        ← React entry point
    └── App.jsx         ← ENTIRE APP (landing + app + logo)
```

---

## Before You Deploy — One Required Change

Open `src/App.jsx` and find line 3:

```js
const GUMROAD_URL = "https://gumroad.com/l/poolfund";
```

Replace with your real Gumroad product link.

---

## Deploy to Vercel — Step by Step

### Step 1 — Install Node.js (if you don't have it)
Download from https://nodejs.org — install the LTS version.

### Step 2 — Create a GitHub account
Go to https://github.com → Sign Up (free).

### Step 3 — Create a new GitHub repository
1. Click the **+** icon → **New repository**
2. Name it `poolfund`
3. Set to **Public**
4. Click **Create repository**

### Step 4 — Push this code to GitHub
Open Terminal (Mac) or Command Prompt (Windows) in this folder and run:

```bash
git init
git add .
git commit -m "Initial PoolFund deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/poolfund.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

### Step 5 — Create a Vercel account
Go to https://vercel.com → Sign Up with GitHub.

### Step 6 — Import your project
1. Click **Add New Project**
2. Select your `poolfund` repository
3. Vercel auto-detects Vite — no config needed
4. Click **Deploy**

### Step 7 — You're live 🎉
Vercel gives you a URL like `poolfund.vercel.app` in about 60 seconds.

---

## Optional — Add a Custom Domain

1. Buy `poolfund.app` (or similar) at https://namecheap.com (~$15/year)
2. In Vercel → Your project → **Settings → Domains**
3. Add your domain and follow the DNS instructions
4. Done — your app is live at your custom domain

---

## After Deployment — Update Share Links

In `src/App.jsx`, find this line in the `generateInviteMessage` function:

```js
const url = `https://poolfund.app/goal/${goal.id}`;
```

Replace `poolfund.app` with your actual Vercel URL (or custom domain).

---

## Making Updates

Once deployed, any change you push to GitHub auto-deploys:

```bash
git add .
git commit -m "Your change description"
git push
```

Vercel picks it up automatically within 30 seconds.

---

## Connecting a Real Backend (Later)

When you're ready to add Supabase:
1. Create a project at https://supabase.com
2. Add your Supabase URL + anon key to Vercel's **Environment Variables**
3. Replace localStorage calls in App.jsx with Supabase queries

---

## Support

Questions? Email: hello@poolfund.app
