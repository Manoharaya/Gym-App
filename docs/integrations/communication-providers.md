# Communication Integration Architecture

## Overview
FitCore unifies transactional messaging across SMS, WhatsApp, Email, and Mobile Push Notification channels through the Day 48 Integration Platform, consolidating Day 28 notification delivery mechanisms.

---

## Supported Providers

| Channel | Provider | Authentication | Capabilities |
|---------|----------|----------------|--------------|
| **SMS** | Twilio, Sparrow SMS | Account SID & Auth Token / ApiKey | SMS delivery, delivery receipts, shortcode/sender IDs |
| **WhatsApp** | Twilio WhatsApp, Meta WhatsApp Business API | Bearer Token / System Access Token | Template messages, media attachments, status callbacks |
| **Email** | SendGrid, AWS SES | API Key / AWS IAM Credentials | Transactional templates, open/click webhooks, bounce handling |
| **Push** | Firebase Cloud Messaging (FCM), Apple APNs | Service Account JSON / P8 Key | Device token broadcast, quiet hours honoring, deep link payload |

---

## Delivery Receipt & Inbound Webhooks

When external messaging carriers process or receive responses:
1. Provider calls `POST /api/v1/integrations/webhooks/:provider`.
2. Signature is validated (e.g. `X-Twilio-Signature`, SendGrid Event Webhook ECDSA).
3. Payload is normalized into internal events (`COMMUNICATION_DELIVERED`, `COMMUNICATION_BOUNCED`, `COMMUNICATION_FAILED`).
4. Notification records in FitCore are updated in real-time.
5. Inbound opt-out keywords (`STOP`, `UNSUBSCRIBE`) are routed to member communication preference managers.
