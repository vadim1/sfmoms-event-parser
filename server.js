const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Store processed events for debugging
const processedEvents = [];

// Email transporter (configured via env vars)
let transporter = null;

function setupEmailTransporter() {
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
}

// Parse event text into structured data
function parseEvents(text) {
  if (!text) return [];
  
  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Split by patterns that indicate new events (day of week or month name at start of line)
  const chunks = text.split(/\n(?=(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|January|February|March|April|May|June|July|August|September|October|November|December|\d{1,2}\/\d{1,2}))/i);
  
  const events = [];
  
  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    
    const event = parseEventChunk(trimmed);
    if (event && event.title) {
      events.push(event);
    }
  }
  
  return events;
}

function parseEventChunk(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return null;

  const event = {
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    address: '',
    organizer: '',
    url: '',
    cost: '',
    description: ''
  };

  let currentLine = 0;

  // Line 1: Usually date/time
  const dateMatch = lines[currentLine]?.match(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)?,?\s*(.+)/i);
  if (dateMatch) {
    const dateTimeStr = dateMatch[2] || dateMatch[0];
    const parsed = parseDateTimeString(dateTimeStr);
    event.date = parsed.date;
    event.startTime = parsed.startTime;
    event.endTime = parsed.endTime;
    currentLine++;
  }

  // Line 2: Usually title
  if (lines[currentLine] && !lines[currentLine].match(/^(https?:|Hosted by)/i)) {
    event.title = lines[currentLine];
    currentLine++;
  }

  // Remaining lines: venue, organizer, URL
  for (let i = currentLine; i < lines.length; i++) {
    const line = lines[i];

    // URL detection
    if (line.match(/^https?:/i)) {
      event.url = line;
      continue;
    }

    // Hosted by detection
    const hostedMatch = line.match(/^Hosted by\s+(.+)/i);
    if (hostedMatch) {
      event.organizer = hostedMatch[1];
      continue;
    }

    // Address with · separator (like "Venue · City")
    if (line.includes('·') || line.includes('•')) {
      const parts = line.split(/[·•]/);
      event.venue = parts[0].trim();
      if (parts[1]) {
        event.address = parts.slice(1).join(', ').trim();
      }
      continue;
    }

    // Street address pattern
    if (line.match(/^\d+\s+\w+/)) {
      event.address = line;
      continue;
    }

    // If we don't have a venue yet, this might be it
    if (!event.venue && !line.match(/^(https?:|Hosted by|\$|Free)/i)) {
      event.venue = line;
    }
  }

  return event;
}

function parseDateTimeString(str) {
  const result = { date: '', startTime: '', endTime: '' };
  
  // Extract date like "Jan 11, 2026" or "January 11, 2026"
  const dateMatch = str.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})?/);
  if (dateMatch) {
    const monthNames = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    };
    const month = monthNames[dateMatch[1].toLowerCase()];
    if (month) {
      const day = dateMatch[2].padStart(2, '0');
      const year = dateMatch[3] || new Date().getFullYear().toString();
      result.date = `${year}-${month}-${day}`;
    }
  }

  // Extract time like "10 AM", "10:30 AM", or range "10 AM - 12 PM"
  const timeMatch = str.match(/(\d{1,2}(?::\d{2})?)\s*(AM|PM)(?:\s*[-–to]+\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM))?/i);
  if (timeMatch) {
    result.startTime = formatTime(timeMatch[1], timeMatch[2]);
    if (timeMatch[3] && timeMatch[4]) {
      result.endTime = formatTime(timeMatch[3], timeMatch[4]);
    }
  }

  return result;
}

function formatTime(time, ampm) {
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours);
  minutes = minutes || '00';
  
  if (ampm.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Format date for display
function formatDateForDisplay(dateStr) {
  if (!dateStr) return 'No date';
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// Generate the form submission URL with pre-filled data
function generateFormUrl(event) {
  // SF Moms doesn't support URL params for pre-fill, so we'll just return the base URL
  // The actual form filling happens via the manual bookmarklet or extension
  return 'https://sanfranciscomoms.com/addevent/';
}

// Generate email reply with results
function generateEmailReply(events, errors) {
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #e85d4c, #c94a3b); color: white; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; }
    .event-card { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #e85d4c; }
    .event-title { font-size: 18px; font-weight: 600; color: #2d2a26; margin-bottom: 8px; }
    .event-meta { font-size: 14px; color: #666; }
    .event-meta div { margin: 4px 0; }
    .status { padding: 12px; border-radius: 6px; margin-bottom: 16px; }
    .status.success { background: #e8f5e9; color: #2e7d32; }
    .status.warning { background: #fff3e0; color: #e65100; }
    .status.error { background: #ffebee; color: #c62828; }
    .action-btn { display: inline-block; background: #e85d4c; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin-top: 8px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #999; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
    .copy-section { background: #f5f5f5; padding: 12px; border-radius: 6px; margin-top: 12px; font-family: monospace; font-size: 11px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 SF Moms Event Parser</h1>
    <p style="margin: 8px 0 0 0; opacity: 0.9;">Processed at ${timestamp}</p>
  </div>
  <div class="content">
`;

  if (errors.length > 0) {
    html += `<div class="status error">⚠️ ${errors.join('<br>')}</div>`;
  }

  if (events.length === 0) {
    html += `
    <div class="status warning">
      <strong>No events found in your email.</strong><br>
      Make sure your events follow this format:
      <pre style="margin-top: 8px; font-size: 12px;">
Sun, Jan 11, 2026 at 10 AM
Event Title Here
Venue Name or Address
Hosted by Organizer Name
https://event-url.com</pre>
    </div>`;
  } else {
    html += `<div class="status success">✅ Found and parsed ${events.length} event(s)!</div>`;
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      html += `
      <div class="event-card">
        <div class="event-title">${escapeHtml(event.title)}</div>
        <div class="event-meta">
          <div>📅 ${formatDateForDisplay(event.date)} ${event.startTime ? `at ${formatTimeForDisplay(event.startTime)}` : ''}</div>
          <div>📍 ${escapeHtml(event.venue || event.address || 'No venue specified')}</div>
          ${event.organizer ? `<div>👤 ${escapeHtml(event.organizer)}</div>` : ''}
          ${event.url ? `<div>🔗 <a href="${escapeHtml(event.url)}">${escapeHtml(event.url.substring(0, 50))}...</a></div>` : ''}
        </div>
        <a href="${generateFormUrl(event)}" class="action-btn">Add to SF Moms →</a>
        
        <div class="copy-section">
          <strong>Quick-fill script (paste in browser console on SF Moms form):</strong><br><br>
          ${generateCompactScript(event)}
        </div>
      </div>`;
    }
    
    html += `
    <div style="background: #fff9e6; border: 1px solid #ffe082; border-radius: 8px; padding: 16px; margin-top: 16px;">
      <strong style="color: #f9a825;">📋 How to add events:</strong>
      <ol style="margin: 12px 0 0 20px; padding: 0; color: #5d4e37;">
        <li>Click "Add to SF Moms" button above</li>
        <li>Open browser console (Cmd+Option+J on Mac)</li>
        <li>Copy the quick-fill script and paste it</li>
        <li>Select venue/organizer from dropdowns</li>
        <li>Add image, check terms, submit!</li>
      </ol>
    </div>`;
  }

  html += `
  </div>
  <div class="footer">
    SF Moms Event Creator Tool<br>
    Reply to this email if you have questions!
  </div>
</body>
</html>`;

  return html;
}

function formatTimeForDisplay(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${displayHour}:${minutes} ${ampm}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateCompactScript(event) {
  // Generate a minified fill script
  const e = JSON.stringify(event);
  return escapeHtml(`(function(){var e=${e};var s=(n,v)=>{var el=document.querySelector(n);if(el&&v){el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}};s('input[name="EventTitle"]',e.title);s('input[name="EventStartDate"]',e.date);s('input[name="EventEndDate"]',e.date);s('input[name="EventStartTime"]',e.startTime);s('input[name="EventEndTime"]',e.endTime);s('input[name="EventURL"]',e.url);var d=document.querySelector('textarea[name="EventDescription"]');if(d){d.value='Hosted by '+e.organizer+'\\n\\nMore info: '+e.url;d.dispatchEvent(new Event('input',{bubbles:true}))}alert('Form filled! Select venue/organizer from dropdowns, add image, check terms & submit.')})();`);
}

// Send reply email
async function sendReplyEmail(toEmail, subject, htmlContent) {
  if (!transporter) {
    console.log('Email not configured - would send to:', toEmail);
    return { sent: false, reason: 'SMTP not configured' };
  }
  
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'SF Moms Events <events@example.com>',
      to: toEmail,
      subject: subject,
      html: htmlContent
    });
    return { sent: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { sent: false, reason: error.message };
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SF Moms Event Parser',
    version: '1.0.0',
    endpoints: {
      'POST /webhook/zapier': 'Receive email from Zapier and parse events',
      'POST /api/parse': 'Parse event text directly',
      'GET /api/events': 'List recently processed events'
    }
  });
});

// Main webhook endpoint for Zapier
app.post('/webhook/zapier', async (req, res) => {
  console.log('Received Zapier webhook:', JSON.stringify(req.body, null, 2));
  
  const {
    from_email,
    from_name,
    subject,
    body_plain,
    body_html,
    raw_body
  } = req.body;

  // Use plain text body, or strip HTML from body_html
  let emailBody = body_plain || '';
  if (!emailBody && body_html) {
    emailBody = body_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  }
  if (!emailBody && raw_body) {
    emailBody = raw_body;
  }

  const errors = [];
  
  if (!emailBody) {
    errors.push('No email body content found');
  }

  // Parse events from email
  const events = parseEvents(emailBody);
  
  // Store for debugging
  const record = {
    timestamp: new Date().toISOString(),
    from: from_email,
    subject,
    eventsFound: events.length,
    events
  };
  processedEvents.unshift(record);
  if (processedEvents.length > 100) processedEvents.pop();

  // Generate reply email
  const replySubject = events.length > 0 
    ? `✅ Parsed ${events.length} event(s) from: ${subject || 'your email'}`
    : `⚠️ No events found in: ${subject || 'your email'}`;
  
  const replyHtml = generateEmailReply(events, errors);

  // Send reply if email configured
  let emailResult = { sent: false, reason: 'Not attempted' };
  if (from_email) {
    emailResult = await sendReplyEmail(from_email, replySubject, replyHtml);
  }

  // Return response to Zapier
  res.json({
    success: true,
    events_parsed: events.length,
    events: events,
    email_reply: emailResult,
    message: events.length > 0 
      ? `Successfully parsed ${events.length} event(s)`
      : 'No events found in email body'
  });
});

// Direct API endpoint for parsing
app.post('/api/parse', (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Missing "text" field in request body' });
  }

  const events = parseEvents(text);
  
  res.json({
    success: true,
    events_parsed: events.length,
    events: events
  });
});

// Get recently processed events
app.get('/api/events', (req, res) => {
  res.json({
    total: processedEvents.length,
    events: processedEvents.slice(0, 20)
  });
});

// Test endpoint to verify parsing
app.get('/test', (req, res) => {
  const testText = `Sun, Jan 11, 2026 at 10 AM
Science Fun
800 Foster City Blvd, Foster City
Hosted by JBN and Wornick Jewish Day School
https://www.wornickjds.org/forms-and-registrations/science-fun

Sun, Jan 25, 2026 at 10:30 AM
Peninsula Newborn Playgroup for Babies 0 - 9 Months
Jewish Family & Children's Services  · Palo Alto
Hosted by JBN
https://www.eventbrite.com/e/peninsula-newborn-playgroup`;

  const events = parseEvents(testText);
  
  res.send(`
    <html>
    <head><title>Parser Test</title></head>
    <body style="font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px;">
      <h1>🧪 Parser Test</h1>
      <h2>Input:</h2>
      <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(testText)}</pre>
      <h2>Parsed Events (${events.length}):</h2>
      <pre style="background: #e8f5e9; padding: 16px; border-radius: 8px; white-space: pre-wrap;">${escapeHtml(JSON.stringify(events, null, 2))}</pre>
      <h2>Sample Reply Email:</h2>
      <iframe srcdoc="${escapeHtml(generateEmailReply(events, []))}" style="width: 100%; height: 800px; border: 1px solid #ddd; border-radius: 8px;"></iframe>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;

setupEmailTransporter();

app.listen(PORT, () => {
  console.log(`SF Moms Event Parser running on port ${PORT}`);
  console.log(`Test at: http://localhost:${PORT}/test`);
});
