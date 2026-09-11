# Marketplace Reviews & Social Proof Engine

## 1. Verified Customer Guarantee
To prevent review spam and fraudulent competitors, reviews are strictly restricted:
1. **Active/Past Installation Required**: The reviewing organisation must have installed the target application (`isVerifiedInstallation: true`).
2. **Single Review Constraint**: Database enforces `@@unique([listingId, organisationId])`. An organization can update their review but cannot submit multiple entries.

## 2. Real-Time Rating Aggregation
Whenever a review is created, modified, flagged, or hidden:
* `ratingAverage`: Recomputed as the arithmetic mean of all `PUBLISHED` reviews, rounded to two decimals.
* `reviewCount`: Recomputed as the total count of active `PUBLISHED` reviews.

## 3. Flagging & Community Moderation
* Users can flag suspicious or offensive reviews (`POST /marketplace/reviews/:id/flag`).
* Admins can moderate reviews (`POST /marketplace/admin/reviews/:id/moderate`) to change status to `PUBLISHED`, `FLAGGED`, `HIDDEN`, or `REMOVED`.
