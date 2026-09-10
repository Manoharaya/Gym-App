# Voice Configuration & Phone Numbers — Day 34

## Phone Number Ownership

Every phone number in FitCore is mapped to a tenant hierarchy:

```text
Organisation
  ├── Main Reception Number (+1 555 100 2000)
  ├── Outlet A1: Downtown Number (+1 555 100 2001)
  └── Outlet A2: Lalitpur Branch (+977 1 555 3333)
```

## Configurable Attributes (`VoicePhoneNumber`)
- `phoneNumber`: E.164 unique format.
- `outletId`: Optional assignment to specific gym outlet.
- `provider`: Telephony provider (`DEVELOPMENT`, `TWILIO`).
- `afterHoursMode`: Action outside operating hours (`PLAY_MESSAGE`, `TAKE_LEAD`, `OFFER_CALLBACK`, `TRANSFER_TO_EXTERNAL_NUMBER`, `END_CALL`).
- `greetingMessage`: Custom spoken welcome message.
- `voiceProfileId`: Preferred voice profile and accent.
- `recordingPolicy`: `RECORDING_DISABLED`, `RECORDING_ENABLED`, `REQUIRES_CONSENT`.
- `transcriptionPolicy`: `ENABLED`, `DISABLED`.
- `humanHandoffNumber`: Target PSTN/SIP phone number for live staff escalations.
- `fallbackNumber`: External phone number for after-hours or system fallback.
