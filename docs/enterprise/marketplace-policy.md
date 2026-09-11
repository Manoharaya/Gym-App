# Enterprise Marketplace Policies

## 1. Overview
Connects Day 50 Marketplace Foundation to Day 51 Enterprise Administration. While the marketplace provides discovery and installation mechanisms, enterprise policies define who is permitted to install apps, which listings require vetting, and which permissions can be granted.

## 2. Policy Capabilities
* `allowedListingTypes`: Organization can restrict installations to certified hardware or approved trainer programs.
* `requireApprovalForPiiAccess`: Any marketplace app requesting health data or member PII triggers an automated approval hold requiring `COMPLIANCE_MANAGER` review.
* `whitelistedPublishers`: Limits installations strictly to verified enterprise partners.
* `centralizedBilling`: Marketplace subscription charges can be routed to the corporate headquarters rather than billed per facility.
