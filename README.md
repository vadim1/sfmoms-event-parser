# SF Moms Event Parser - Email to Calendar

Forward emails with event details → automatically parse and get form-filling scripts!

## Quick Setup with Zapier

### Step 1: Deploy the Server

**Option A: Glitch (Free, Easiest)**
1. Go to [glitch.com](https://glitch.com) and sign in
2. Click "New Project" → "Import from GitHub" 
3. Or create new project and upload these files
4. Your URL will be: `https://YOUR-PROJECT-NAME.glitch.me`

**Option B: Render (Free)**
1. Go to [render.com](https://render.com) and sign in
2. New → Web Service → Connect your repo
3. Use the render.yaml config included

**Option C: Railway (Free tier)**
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. It auto-detects Node.js

### Step 2: Set Up Zapier

1. Go to [zapier.com](https://zapier.com) and sign in
2. Create a new Zap

**Trigger: Email by Zapier**
- Choose "New Inbound Email"
- Zapier will give you a unique email address like: `abc123@robot.zapier.com`
- Save this address - you'll forward events here!

**Action: Webhooks by Zapier**
- Choose "POST"
- URL: `https://YOUR-SERVER-URL/webhook/zapier`
- Payload Type: JSON
- Data:
  ```
  from_email: {{from_email}}
  from_name: {{from_name}}
  subject: {{subject}}
  body_plain: {{body_plain}}
  body_html: {{body_html}}
  ```

3. Test the Zap and turn it on!

### Step 3: (Optional) Set Up Reply Emails

To receive email replies with parsed results, set these environment variables on your server:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=SF Moms Events <your-email@gmail.com>
```

For Gmail, you'll need to create an "App Password" in your Google Account settings.

## Usage

1. Forward any email with event details to your Zapier email address
2. The server parses the events and sends you a reply with:
   - Parsed event details
   - Direct link to SF Moms form
   - Quick-fill script to paste in browser console

## Event Format

The parser understands these patterns:

```
Sun, Jan 11, 2026 at 10 AM
Event Title Here
800 Main Street, City Name
Hosted by Organization Name
https://event-registration-url.com
```

## API Endpoints

- `GET /` - Health check and API info
- `GET /test` - Test the parser with sample data
- `POST /webhook/zapier` - Zapier webhook endpoint
- `POST /api/parse` - Direct parsing (send JSON with "text" field)
- `GET /api/events` - View recently processed events

## Local Development

```bash
npm install
npm start
# Open http://localhost:3000/test
```

## Troubleshooting

**Events not parsing correctly**
- Make sure date is on its own line
- Event title should be on the line after the date
- URLs should start with http:// or https://

**Not receiving reply emails**
- Check SMTP environment variables
- For Gmail, make sure you're using an App Password
- Check spam folder

**Zapier not triggering**
- Verify the Zap is turned on
- Check Zapier's task history for errors
- Make sure webhook URL is correct
