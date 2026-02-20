# Enreach Node

Send WhatsApp messages through the Istra proxy API.

## Operations

### Send and Wait
Send a message and pause workflow until user responds.

**Use for:** Questionnaires, interactive conversations, collecting responses

**Configuration:**
- **Authentication:** JWT Auth or None
- **Trigger Node Name:** Name of Enreach Trigger node (default: "Enreach Trigger")
- **Type:** Text, Button, List, or Annotation
- **Text:** Message content
- **Options:** Buttons or list items (for Button/List types)
- **Limit Wait Time:** Optional timeout configuration

### Send Message
Send a message and continue immediately (no waiting).

**Use for:** Notifications, confirmations, one-way messages

**Configuration:**
- **Type:** Text, Button, List, or Annotation
- **Text:** Message content
- **Options:** Buttons or list items (for Button/List types)

## Message Types

### Text
```
Type: Text
Text: "Your order has been confirmed!"
```

**Limits:** WhatsApp max 4096 characters

### Button
```
Type: Button
Text: "Do you want to continue?"
Options:
  - ID: "yes", Title: "Yes"
  - ID: "no", Title: "No"
```

**Limits:**
- Text: 1024 characters
- Button title: 20 characters
- Recommended: 1-3 buttons

**WhatsApp API:** [Reply Buttons](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-reply-buttons-messages)

### List
```
Type: List
Button Title: "Select"
Text: "Choose a topic:"
Options:
  - ID: "support", Title: "Support", Description: "Get help"
  - ID: "billing", Title: "Billing", Description: "Billing questions"
  - ID: "sales", Title: "Sales", Description: "Contact sales"
```

**Limits:**
- Text: 1024 characters
- Button title: 20 characters
- Options: 3-10 required
- Option title: 24 characters (WhatsApp)
- Description: 72 characters (WhatsApp)

**WhatsApp API:** [List Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/messages/interactive-list-messages)

### Annotation
```
Type: Annotation
Text: "Customer verified. Account #12345."
```

**Important:** Only visible in Istra agent interface, **not sent to WhatsApp**.

**Use for:** Agent notes, internal logging, workflow tracking

## Common Issues

### "Cannot find trigger node"
→ Check trigger node name matches exactly (case-sensitive)

### Text too long
→ Max 1024 characters for button/list types

### "List requires minimum 3 options"
→ Add more options (3-10 required for list type)

## Related

- [Enreach Trigger](enreach-trigger.md)
- [Credentials setup](../credentials/enreach.md)
