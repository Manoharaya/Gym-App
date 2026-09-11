# Marketplace Publishing & Developer Portal

## 1. Publisher Types
* **`FIRST_PARTY`**: Built and maintained directly by the FitCore Engineering team (e.g. Aura AI Voice Receptionist, Core Wearable Sync).
* **`VERIFIED_PARTNER`**: Vetted hardware manufacturers and enterprise software vendors with signed SLA agreements.
* **`COMMUNITY`**: Certified third-party developers building on the Day 49 Developer Platform.
* **`TRAINER`**: Certified fitness instructors and sports performance coaches publishing training programs.

## 2. Listing Submission Workflow
1. Developer registers a `DeveloperApplication` in the Day 49 portal.
2. Developer creates a draft listing via `POST /marketplace/publisher/listings`.
3. Developer uploads icon, banner, screenshots, and populates manifest capabilities and scopes.
4. Developer creates release version 1.0.0 (`POST /marketplace/publisher/listings/:id/versions`).
5. Developer clicks "Submit for Review" (`POST /marketplace/publisher/listings/:id/submit`).
6. Status moves to `UNDER_REVIEW` and appears in the Superadmin Moderation Queue.
