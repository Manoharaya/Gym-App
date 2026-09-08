# AI Receptionist Conversation Dialogue Examples

This document demonstrates verified real-world conversational dialogues between gym prospects/members and the FitCore AI Receptionist.

---

## Example 1: Membership Pricing & Class Inquiry (Web Prospect)

**User (Anonymous Web Chat):**
> "What membership options do you offer and what do they cost?"

**AI Receptionist:**
> "We offer flexible membership options including our Standard ($49/month) and Premium All-Access ($89/month) plans. Both include full gym floor access, locker rooms, and a complimentary wellness consultation."
>
> *Suggested Next Step:* Book a free trial or visit our front desk to sign up.
> *Citations:* `[MEMBERSHIP_PLAN] Membership Plans & Pricing`

---

## Example 2: Multi-Outlet Ambiguity Resolution

**User (Web Chat):**
> "What time do you open tomorrow?"

**AI Receptionist:**
> "We have multiple locations available to serve you. Which location are you interested in (e.g., Downtown or Westside)?"
>
> *Requires Clarification:* Yes
> *Suggested Next Step:* Please specify which branch you are asking about.

**User:**
> "I meant the Downtown club."

**AI Receptionist:**
> "Our facility is open Monday to Friday from 6:00 AM to 10:00 PM, and weekends from 8:00 AM to 8:00 PM. We offer dedicated member parking and secure bicycle storage."
>
> *Requires Clarification:* No
> *Suggested Next Step:* Check in with the FitCore app on arrival.
> *Citations:* `[OUTLET] Operating Hours & Facilities`

---

## Example 3: Non-Existent Facility & Knowledge Gap Tracking

**User (Prospect):**
> "Do you have an Olympic swimming pool and cryotherapy chamber?"

**AI Receptionist:**
> "I checked our official facility directory and we do not have a swimming pool or childcare listed at this location. Would you like me to connect you with our front desk team for more details?"
>
> *Handoff Recommended:* Yes
> *Action Taken:* Knowledge Gap recorded for organisation owner review.

---

## Example 4: Medical Diagnosis Defense

**User:**
> "I have severe acute chest pain after bench pressing. Can you diagnose if I tore a muscle or prescribe medicine?"

**AI Receptionist:**
> "I am an AI receptionist and cannot provide medical diagnoses or treatment advice. If you are experiencing acute pain or an injury, please consult a qualified healthcare professional. Our staff can also connect you with certified trainers for safe exercise modifications once you are cleared."
>
> *Safety Flag:* `MEDICAL_DISCLAIMER`
> *Suggested Next Step:* Consult a medical doctor for injury evaluation.

---

## Example 5: Multilingual Nepali Greeting & Inquiry

**User:**
> "नमस्ते! म तपाईंको जिमको सदस्यता शुल्क र समय तालिका बारे जान्न चाहन्छु।"

**AI Receptionist:**
> "नमस्ते! FitCore मा स्वागत छ। हाम्रो जिम सम्बन्धी जानकारी, शुल्क, समय तालिका र कक्षाहरू बारे म तपाईंलाई मद्दत गर्न सक्छु। म तपाईंलाई कसरी सहयोग गर्न सक्छु?"
>
> *Suggested Next Step:* जिमको समय, सदस्यता शुल्क वा कक्षाहरू बारे सोध्नुहोस्।
> *Confidence:* 0.98
