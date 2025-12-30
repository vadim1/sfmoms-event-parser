# 🚀 Quick Setup Guide - SF Moms Event Parser

## Best Option: Render.com (Free, 5 minutes)

### Step 1: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name it `sfmoms-event-parser`
3. Upload these files from the zip:
   - `server.js`
   - `package.json`
   - `render.yaml`

### Step 2: Deploy to Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click **New → Web Service**
3. Connect your GitHub account
4. Select your `sfmoms-event-parser` repo
5. Render auto-detects settings from `render.yaml`:
   - Name: `sfmoms-event-parser`
   - Runtime: Node
   - Build: `npm install`
   - Start: `npm start`
6. Select **Free** tier
7. Click **Create Web Service**

**Your server URL:** `https://sfmoms-event-parser.onrender.com`

> ⚠️ Note: Free tier sleeps after 15 min inactivity. First request after sleep takes ~30 seconds. Perfect for email forwarding since Zapier will wake it up!

---

## Alternative: Railway.app (Free $5/month credits)

1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. New Project → Deploy from GitHub repo
4. Select your repo - Railway auto-deploys
5. Your URL: `https://YOUR-APP.up.railway.app`

---

## Zapier Setup (5 minutes)

### 1. Create a Zap

Go to [zapier.com/app/zaps](https://zapier.com/app/zaps) → **Create Zap**

### 2. Trigger: Email by Zapier

- Search for **"Email by Zapier"**
- Choose **"New Inbound Email"**
- Zapier gives you a unique email address like: `abc123@robot.zapier.com`
- **Save this email address!** You'll forward events here.

### 3. Action 1: Webhooks by Zapier (Call Parser)

- Search for **"Webhooks by Zapier"**
- Choose **"POST"**
- Configure:

```
URL: https://sfmoms-event-parser.onrender.com/webhook/zapier

Payload Type: JSON

Data:
  from_email    → {{From Email}}
  from_name     → {{From Name}}
  subject       → {{Subject}}
  body_plain    → {{Body Plain}}
```

### 4. Action 2: Send Reply Email (Get Results Back)

- Add another action: **"Email by Zapier"** → **"Send Outbound Email"**
- Configure:
  - **To:** `{{From Email}}` (from Step 1)
  - **Subject:** `✅ SF Moms Events Parsed: {{Subject}}`
  - **Body Type:** HTML
  - **Body:** `{{reply_html}}` (from Step 2 webhook response)

### 5. Test & Activate

1. Send a test email to your Zapier email address
2. Check Zap history to verify it works
3. Turn on the Zap!

---

## 📧 Usage

1. **Forward any email** with event details to your Zapier email
2. **Get a reply** with:
   - ✅ Parsed event details
   - 🔗 Link to SF Moms add event page
   - 📋 Auto-fill script to paste in browser console

3. **Open SF Moms form**, paste the script, select venue/organizer, submit!

---

## Supported Event Formats

```
Sun, Jan 11, 2026 at 10 AM
Event Title Here
800 Main Street, City Name
Hosted by Organization Name
https://event-registration-url.com

Sun, Jan 25, 2026 at 10:30 AM
Another Event
Jewish Family & Children's Services · Palo Alto
Hosted by JBN
https://eventbrite.com/e/...
```

Multiple events? Just separate with blank lines!

---

## Test Your Deployment

Visit: `https://YOUR-APP-URL/test`

This shows sample parsed events to verify everything works.

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/test` | GET | Test with sample events |
| `/webhook/zapier` | POST | Zapier webhook receiver |
| `/api/parse` | POST | Direct API (send `{"text": "..."}`) |

---

## Troubleshooting

**"Service unavailable" on first request?**
- Free tier sleeps after 15min. Wait 30 seconds for it to wake up.
- Or use UptimeRobot (free) to ping `/` every 14 minutes to keep it awake.

**Events not parsing?**
- Date must be first line with day of week
- Title on second line
- URL should start with `http://` or `https://`

**No reply email?**
- Make sure Action 2 in Zapier uses `{{reply_html}}` from webhook response
- Check Zapier task history for errors

