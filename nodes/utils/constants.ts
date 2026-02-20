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

// Timeout configurations
export const TIMEOUT_CONFIG = {
    DEFAULT_WAIT_YEARS: 1,
    PROCESSING_BUFFER_MS: 1000, // Buffer for n8n processing overhead
    MIN_TIMEOUT_MS: 1000,
} as const;

// Time unit multipliers (in milliseconds)
export const TIME_UNITS = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
} as const;

// Message types
export const MESSAGE_TYPES = {
    TEXT: 'text',
    BUTTON: 'button',
    LIST: 'list',
    ANNOTATION: 'annotation',
} as const;