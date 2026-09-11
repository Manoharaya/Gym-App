# Marketplace Dependencies & Conflict Detection

## 1. Dependency Specifications
Listings can specify required or optional dependencies:
```json
"dependencies": [
  {
    "slug": "cloudgate-turnstile-controller",
    "minVersion": "2.0.0",
    "optional": false
  }
]
```
If a non-optional dependency is missing from the target organization or outlet, the pre-flight validator throws `MissingDependencyError` with HTTP 422.

## 2. Mutual Conflict Detection
Listings specify mutually exclusive applications in their `conflicts` array:
```json
"conflicts": ["legacy-rfid-gate-controller"]
```
Validation is bidirectional:
* If the new listing declares a conflict with an already-installed app, installation is blocked.
* If an existing active installation declares a conflict with the new listing, installation is blocked (`ConflictDetectedError`, HTTP 409).
