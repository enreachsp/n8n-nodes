# Enreach Trigger

Receive webhook events from Istra.

## Configuration

**Authentication**
- **JWT Auth** (recommended) - Validates requests with JWT token
- **None** - Accepts all requests (testing only)

## Output Data

```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIs...",
  "sid": "session_abc123",
  "id": "msg_456789",
  "callbackUrl": "https://api.enreach.com/messages"
}
```

**Parameters:**
- `jwt` - JWT token for authentication
- `sid` - Session ID (track conversation)
- `id` - Message ID
- `callbackUrl` - Istra endpoint

## Authentication

### JWT Auth
- Validates token signature (HMAC SHA-256)
- Checks token expiry
- Returns 401 if invalid

**Requires:** [Enreach credentials](../credentials/enreach.md)

### None
- Accepts all requests
- No validation
- Use only for testing

## Common Issues

### Webhook not receiving requests
→ Activate workflow (not test mode)
→ Verify URL in Istra proxy configuration

### JWT validation fails
→ Check JWT secret in credentials
→ Verify token hasn't expired

### Returns 401 Unauthorized
→ Token validation failed (expected with JWT Auth)
→ Verify credentials are correct

## Related

- [Enreach Node](enreach.md)
- [Credentials setup](../credentials/enreach.md)
