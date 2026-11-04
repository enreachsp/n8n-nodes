/**
 * Enreach Node Constants and Configuration
 */

// Message and field limits
export const ENREACH_LIMITS = {
    TEXT_MAX_LENGTH: 1024,
    BUTTON_TITLE_MAX_LENGTH: 20,
    OPTION_ID_MAX_LENGTH: 256,
    LIST_MIN_OPTIONS: 3,
    LIST_MAX_OPTIONS: 10,
} as const;

// Message types
export const MESSAGE_TYPES = {
    TEXT: 'text',
    BUTTON: 'button',
    LIST: 'list',
    ANNOTATION: 'annotation',
} as const;