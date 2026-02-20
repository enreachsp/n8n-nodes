# Enreach Credentials

JWT authentication for Istra proxy webhook validation.

## Setup

1. Go to **Credentials** in n8n
2. Click **Add Credential**
3. Select **Enreach API**
4. Enter **JWT Secret** (provided by Enreach/Istra)
5. Give it a name (e.g., "Enreach Production")
6. Click **Save**

## JWT Secret

The secret key used by Istra proxy to sign JWT tokens (HMAC SHA-256).

## Using Credentials

**Enreach Node (Send and Wait):**
- Operation: Send and Wait
- Authentication: JWT Auth
- Select credential from dropdown

**Enreach Trigger:**
- Authentication: JWT Auth
- Select credential from dropdown

## Related

- [Enreach Node](../nodes/enreach.md)
- [Enreach Trigger](../nodes/enreach-trigger.md)
