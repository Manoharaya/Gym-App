# Marketplace Moderation & Admin Control

## 1. Moderation Responsibilities
Superadministrators and platform operators review submitted applications to verify:
* **Manifest Accuracy**: Requested permissions match declared functionality.
* **Security & SSRF Safeguards**: Webhook endpoints comply with Day 49 SSRF validation rules.
* **Health Privacy Compliance**: No unauthorized bypass of biometric quarantines.
* **Branding & Quality**: High-resolution icons, non-deceptive taglines, working support URLs.

## 2. Admin Actions
* **Approve & Publish**: `POST /marketplace/admin/listings/:id/approve` transitions status to `PUBLISHED` and marks listing `verified: true`.
* **Reject Submission**: `POST /marketplace/admin/listings/:id/reject` reverts status to `DRAFT` and attaches actionable review notes.
* **Emergency Suspension**: `POST /marketplace/admin/listings/:id/suspend` immediately hides the listing from discovery and logs audit alerts.
