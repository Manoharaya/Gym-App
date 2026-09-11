# FitCore API Pagination & Filtering

## 1. Standard Pagination Envelope
All FitCore list endpoints return a standard pagination metadata envelope:

```json
{
  "data": [
    { "id": "mem_1", "firstName": "John", "lastName": "Doe" },
    { "id": "mem_2", "firstName": "Jane", "lastName": "Smith" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "hasMore": true,
    "requestId": "req_1726054890_928172"
  }
}
```

## 2. Query Parameters
List endpoints support standard pagination query parameters:

| Parameter | Type | Default | Max | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | integer | 1 | - | 1-based page index |
| `limit` | integer | 20 | 100 | Number of records per page |
| `status` | string | - | - | Optional status filter (e.g. `ACTIVE`, `CONFIRMED`) |
| `outletId` | string | - | - | Filter resources scoped to a specific gym outlet |
| `from` | ISO8601 | - | - | Filter sessions/bookings starting on or after date |
| `to` | ISO8601 | - | - | Filter sessions/bookings starting on or before date |

## 3. Pagination Traversing Example (TypeScript)
```typescript
async function fetchAllMembers(apiKey: string): Promise<Member[]> {
  const allMembers: Member[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`https://api.fitcore.com/api/v1/public/members?page=${page}&limit=50`, {
      headers: { 'X-Api-Key': apiKey },
    });
    const { data, meta } = await res.json();
    allMembers.push(...data);

    hasMore = meta.hasMore;
    page += 1;
  }

  return allMembers;
}
```
