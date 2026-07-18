# Part 133 Provider Configuration

Configure only in Render Environment:

```text
NAXORA_COMM_EMAIL_WEBHOOK_URL
NAXORA_COMM_EMAIL_PROVIDER_NAME
NAXORA_COMM_SMS_WEBHOOK_URL
NAXORA_COMM_SMS_PROVIDER_NAME
NAXORA_COMM_WHATSAPP_WEBHOOK_URL
NAXORA_COMM_WHATSAPP_PROVIDER_NAME
NAXORA_COMM_PROVIDER_TOKEN
NAXORA_COMM_ADDRESS_ENCRYPTION_KEY
```

Rules:
- HTTPS endpoint required.
- Localhost and private-network URLs are blocked.
- Client/VANI cannot provide a provider URL.
- Provider token is never returned.
- Missing provider becomes `skipped_provider_unconfigured`.
- Provider acceptance does not prove final delivery.
