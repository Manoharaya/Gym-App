# AI Receptionist Omnichannel Lead Capture

## 1. Overview
The AI Receptionist serves as the primary digital front-desk agent across Web Chat, Mobile App, WhatsApp, and SMS. During conversations with non-members, the receptionist continuously looks for opportunities to capture interest and guide prospects toward memberships, trials, or club visits.

---

## 2. Inbound Conversational Intents
The receptionist intent classifier recognizes:
- `LEAD_INTEREST`: General visitor stating interest in joining.
- `MEMBERSHIP_INQUIRY`: Questions regarding membership rates and contract options.
- `TRIAL_INQUIRY`: Inquiring about day passes or free trials.
- `TOUR_INQUIRY`: Inquiring about visiting the facility in person.
- `PRICE_INQUIRY`: Direct questions regarding pricing tiers.
- `TRAINER_INQUIRY`: Inquiring about certified trainers and personal coaching.

---

## 3. Conversational Guidelines & Flow

### A. Non-Intrusive Engagement
The receptionist must not demand contact details before providing answers. It answers initial questions first (e.g. hours, class timetable, pricing ranges) and then offers to capture contact details for follow-up:
> "Our standard all-access membership is $25/week with zero sign-up fees this month. Would you like me to send you a 1-day complimentary guest pass so you can check out the gym?"

### B. Natural Contact Capture
When the visitor expresses interest in a trial, tour, or offer, the receptionist collects name, email, or phone number:
> "Great! What is the best email or mobile number to send your pass confirmation?"

### C. Multilingual Support
Conversations in Nepali (नेपाली) or English are seamlessly handled:
> "नमस्ते! हाम्रो सिड्नी सेन्ट्रल जिममा स्वागत छ। के म तपाईंलाई हाम्रो सदस्यता योजनाहरू वा ट्रायल पास बारे जानकारी दिन सक्छु?"

---

## 4. Anti-Pattern Prohibitions
1. **Never fabricate contact details**: The receptionist must never invent phone numbers or emails.
2. **Never claim unauthorized discounts**: Discounts are restricted to official published membership plans.
3. **Never fabricate consent**: If the customer provides an email for a specific inquiry, the receptionist cannot assume full marketing consent without explicit agreement.
