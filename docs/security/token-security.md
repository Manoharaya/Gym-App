# Refresh Token Rotation & Compromise Detection

## Token Rotation Flow
```text
Client presents Refresh Token A
       ↓
Server verifies signature & non-expired status
       ↓
Check if Refresh Token A was already consumed (isRevoked = true)
   ↙                                  ↘
NO (Normal Rotation)                   YES (Anomaly Detected)
 ↓                                      ↓
Issue Access Token B                   Mark session COMPROMISED
Issue Refresh Token C                  Invalidate entire token family
Invalidate Refresh Token A             Emit REFRESH_TOKEN_REUSE_DETECTED
Persist in PostgreSQL transaction      Create SecurityAlert
Return tokens to Client                Reject request with 401
```

---

## Token Replay & Session Theft Defense
When an attacker steals an old refresh token and attempts to replay it after the legitimate user has already rotated to a new token, FitCore immediately flags the collision as an active breach attempt, terminates the entire token family, and raises a HIGH severity security alert for administrators.
