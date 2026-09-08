# Day 32 — AI Receptionist Booking Conversational Examples

This document provides representative, end-to-end conversation transcripts showcasing the conversational flow, multi-outlet disambiguation, two-step confirmation, policy enforcement, atomic rescheduling, and multilingual support (English + Nepali).

---

## Example 1: Class Discovery & Confirmed Reservation (English)

**User:** "Hi, what classes are running tomorrow morning at Downtown?"

**AI Receptionist:**
> "Good morning! Here are the classes scheduled tomorrow morning at **Downtown Club**:
> 
> 1. **Morning HIIT** — 7:00 AM – 7:45 AM (Trainer: Sarah Trainer)  
>    *Spots remaining: 8 / 20*  
>    *Eligibility: Included in your All-Access Unlimited membership.*
> 
> Would you like me to reserve a spot for you in this session?"

**User:** "Yes, please book Morning HIIT for me."

**AI Receptionist:**
> "I can confirm that reservation for you:
> 
> * **Class:** Morning HIIT
> * **Time:** Tomorrow, 7:00 AM – 7:45 AM
> * **Location:** Downtown Club (Studio A)
> * **Trainer:** Sarah Trainer
> * **Cancellation Policy:** Free cancellation up to 2 hours before start.
> 
> Shall I go ahead and confirm your booking?"

**User:** "Yes, go ahead."

*(System: Validates confirmation token `ct_...`, executes transaction lock, verifies DB state)*

**AI Receptionist:**
> "You're all booked! 🎉 Your reservation for **Morning HIIT** tomorrow at 7:00 AM at Downtown Club is confirmed (Booking ID: `bk_982a1`). Please arrive 10 minutes early with a water bottle and sweat towel. See you tomorrow!"

---

## Example 2: Multilingual Class Inquiry & Booking (Nepali / नेपाली)

**User:** "नमस्ते! मलाई भोलिको बिहान हुने कक्षाहरू बारे जानकारी दिनुहोस्।"

**AI Receptionist:**
> "नमस्ते! FitCore मा स्वागत छ। भोलिको बिहान Downtown Club मा निम्न कक्षा उपलब्ध छ:
> 
> * **Morning HIIT** (७:०० बिहान – ७:४५ बिहान)
> * **प्रशिक्षक:** Sarah Trainer
> * **उपलब्ध सिट:** ८ बाँकी
> * **योग्यता:** तपाईंको सक्रिय सदस्यतामा समावेश छ।
> 
> के तपाईं भोलिको बिहान ७:०० बजेको HIIT कक्षा बुक गर्न चाहनुहुन्छ? कृपया पुष्टि गर्नुहोस्।"

**User:** "हो, बुक गरिदिनुहोस्।"

*(System: Executes two-step confirmation with token)*

**AI Receptionist:**
> "तपाईंको बुकिङ सफलतापूर्वक सम्पन्न भयो! भोलि बिहान ७:०० बजे Downtown Club मा Morning HIIT कक्षाको लागि तपाईंको सिट सुरक्षित गरिएको छ। धन्यवाद!"

---

## Example 3: Booking Cancellation Within Notice Window

**User:** "I won't be able to make my HIIT class tomorrow at 7 AM. Can you cancel it?"

**AI Receptionist:**
> "I found your booking for **Morning HIIT** tomorrow at 7:00 AM at Downtown Club.
> 
> * **Cancellation Window:** Up to 2 hours prior (cutoff: 5:00 AM tomorrow).
> * **Late Fee:** None ($0.00).
> 
> Are you sure you would like to cancel this booking?"

**User:** "Yes, cancel it please."

*(System: Validates token for CANCEL_BOOKING, marks status CANCELLED, verifies DB)*

**AI Receptionist:**
> "Your booking for Morning HIIT tomorrow has been cancelled. No cancellation fees applied. We hope to see you in another session soon!"

---

## Example 4: Atomic Rescheduling (Preserving Spot on Failure)

**User:** "Can I move my Thursday 9 AM HIIT class to tomorrow at 5 PM?"

**AI Receptionist:**
> "Checking availability... The tomorrow 5:00 PM session is currently **Full (0 spots remaining)**, but waitlist is open.
> 
> To protect your schedule, your Thursday 9:00 AM booking **remains confirmed**. Would you like to join the waitlist for tomorrow 5:00 PM instead?"

**User:** "Yes, put me on the waitlist."

*(System: Invokes join_waitlist with confirmation token)*

**AI Receptionist:**
> "You've been added to the waitlist for tomorrow 5:00 PM (Position #1). If a spot opens up, you will be notified automatically. Your Thursday 9:00 AM spot remains active!"

---

## Example 5: Unauthenticated Prospect Restriction

**Prospect (Unauthenticated):** "Hey, book me into the 7 AM HIIT class tomorrow."

**AI Receptionist:**
> "I can see that **Morning HIIT** has 8 spots open tomorrow at 7:00 AM at Downtown Club! However, class bookings and reservations require an active FitCore member account.
> 
> Would you like me to connect you with our front desk team to set up a trial pass, or share our membership options?"
