# Optional Provider Setup Guide

Private Render variables:

```env
NAXORA_PART126_EMAIL_WEBHOOK_URL=
NAXORA_PART126_SMS_WEBHOOK_URL=
NAXORA_PART126_WHATSAPP_WEBHOOK_URL=
NAXORA_PART126_DELIVERY_SECRET=
```

Part 126 sends a server-to-server JSON POST. Provider URL never comes from the browser.

The provider must return HTTP 2xx before Part 126 reports `provider_delivered`.

Keep URLs and secrets out of chat, VANI, GitHub and screenshots.
