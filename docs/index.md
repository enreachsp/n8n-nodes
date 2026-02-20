# Enreach

Create WhatsApp bots and custom questionnaires easily with n8n.

## Overview

Enreach nodes connect to WhatsApp via the **Istra proxy API**, enabling you to:
- Build conversational WhatsApp bots
- Create interactive questionnaires and surveys

## Nodes

- **[Enreach](nodes/enreach.md)** - Send WhatsApp messages and questions
- **[Enreach Trigger](nodes/enreach-trigger.md)** - Receive user responses

## Message Types

### Text
Plain text messages. No character limit.

### Button
Reply buttons (1-3 recommended, WhatsApp limit: 3 buttons)

**Limits:**
- Text: 1024 characters
- Button title: 20 characters

### List
Dropdown list (3-10 options required)

**Limits:**
- Button title: 20 characters
- Text: 1024 characters
- Options: 3-10

### Annotation
Agent-only messages. **Not sent to WhatsApp**, only visible in Istra agent interface.

**Use for:** Internal notes, logging, workflow tracking.

## Authentication

- **JWT Auth** (recommended) - Validates requests with HMAC SHA-256
- **None** - No validation (testing only)

Setup: [Credentials documentation](credentials/enreach.md)

## Common Issues

**"Trigger node not found"**
→ Check node name matches exactly

**JWT validation fails**
→ Verify JWT secret in credentials

## Resources

- [Enreach Node documentation](nodes/enreach.md)
- [Enreach Trigger documentation](nodes/enreach-trigger.md)
- [Credentials setup](credentials/enreach.md)
- [WhatsApp Cloud API docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
