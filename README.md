# n8n-nodes-enreach

n8n community node for [Enreach UP](https://enreach.com) communication services.

[n8n](https://n8n.io/) is a workflow automation platform.

## Installation

### Community Nodes (Recommended)

In n8n: **Settings** > **Community Nodes** > Install `n8n-nodes-enreach`

### Manual

```bash
npm install n8n-nodes-enreach
```

## Nodes

### Enreach UP Trigger

Webhook trigger for receiving Enreach events.

**Configuration:**
- Custom webhook path (use UUID for security)
- JWT authentication (optional) — Enreach authenticates with an `Authorization: Bearer <JWT>` header, validated (HS256) with the secret stored in the credentials
- The callback token (`X-Callback-Auth-Token` header, or legacy `jwt` body field) is never validated: it is exposed as `json.jwt` and sent back to Enreach on calls to the callback URL

### Enreach UP

Send messages through Enreach UP API.

**Operations:**
- **Send Message** - Send a message to the Enreach conversation that started the workflow

> **Breaking change in 2.0.0:** the **Send and Wait** operation was removed. n8n does not allow
> webhooks on community action nodes, and Send and Wait relied on one to resume the workflow.
> Send and Wait was the default operation, and n8n does not save a parameter left at its default,
> so most workflows built with it now **send the message without waiting** for the reply. Those
> that saved the operation explicitly fail with an error naming the removal. Review these workflows.

**Message Types:**
- **Text** - Simple text message
- **Button** - Message with button options
- **List** - Message with selectable list (3-10 options)
- **Annotation** - Annotation message

## Quick Start

### 1. Setup Credentials

Create **Enreach UP API** credentials with your JWT secret.

Saving the credentials runs a local test that only checks that the secret is not empty. Nothing is sent over the network: the secret is checked when Enreach calls the trigger with a signed token.

### 2. Basic Workflow

```
[Enreach UP Trigger] → [Your Logic] → [Enreach UP: Send Message]
```

### 3. Example: Send List

```json
{
  "type": "list",
  "text": "Choose an option:",
  "buttonTitle": "Select",
  "options": [
    { "id": "1", "title": "Option 1", "description": "First" },
    { "id": "2", "title": "Option 2", "description": "Second" },
    { "id": "3", "title": "Option 3", "description": "Third" }
  ]
}
```

### 4. Example: Send Buttons

```json
{
  "type": "button",
  "text": "Do you want to continue?",
  "options": [
    { "id": "yes", "title": "Yes" },
    { "id": "no", "title": "No" }
  ]
}
```

## Features

- **Auto-detection** of JWT and callback URL from trigger node
- **Manual or JSON** options input
- **Error handling** with continue on fail option

## Limits

| Field | Limit |
|-------|-------|
| Text (list/button) | 1024 chars |
| Button title | 20 chars |
| Option ID | 256 chars |
| List options | 3-10 options |

## Troubleshooting

**Trigger stops after 2 minutes?**
- Activate the workflow (don't use Test mode)
- Test mode has 2-minute timeout
- Active workflows have no timeout

**"Trigger node not found"?**
- Check trigger node name in configuration
- Verify nodes are connected

**"JWT validation failed"?**
- Verify JWT secret in credentials
- Check token hasn't expired
- Confirm the token is sent in the `Authorization: Bearer <JWT>` header

## License

MIT

## Resources

- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [Enreach UP Documentation](https://www.enreach.com/)
