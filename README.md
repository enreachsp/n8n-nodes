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
- JWT authentication (optional)

### Enreach UP

Send messages through Enreach UP API.

**Operations:**
- **Send and Wait** - Send message and wait for response
- **Send Message** - Send message without waiting

**Message Types:**
- **Text** - Simple text message
- **Button** - Message with button options
- **List** - Message with selectable list (3-10 options)
- **Annotation** - Annotation message

## Quick Start

### 1. Setup Credentials

Create **Enreach UP API** credentials with your JWT secret.

### 2. Basic Workflow

```
[Enreach UP Trigger] → [Enreach UP: Send and Wait] → [Your Logic]
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
- **Timeout configuration** for wait operations
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

## License

MIT

## Resources

- [n8n Community Nodes](https://docs.n8n.io/integrations/community-nodes/)
- [Enreach UP Documentation](https://www.enreach.com/)
