import { IWebhookFunctions } from 'n8n-workflow';
import { JwtValidator } from './JwtValidator';

export interface WebhookAuthResult {
    isValid: boolean;
    error?: {
        status: number;
        message: string;
        error: string;
    };
}

/**
 * Shared JWT validation for webhooks
 * Used by both EnreachTrigger and EnreachUtils
 */
export async function validateWebhookAuth(
    webhookFunctions: IWebhookFunctions,
    jwt: string | undefined,
    authMethod?: string
): Promise<WebhookAuthResult> {
    // If authentication is disabled, always return valid
    if (authMethod === 'none') {
        return { isValid: true };
    }

    // Check JWT exists and is not whitespace-only
    if (!jwt || !jwt.trim()) {
        return {
            isValid: false,
            error: {
                status: 401,
                error: 'Unauthorized',
                message: 'JWT token missing in Authorization header'
            }
        };
    }

    // Get the secret from the Enreach API credentials, or from n8n's built-in
    // JWT Auth credentials still bound by workflows created with older node versions
    let extractSecret: () => string;
    try {
        const credentials = await webhookFunctions.getCredentials('enreachApi');
        extractSecret = () => JwtValidator.extractEnreachSecret(credentials);
    } catch {
        try {
            const credentials = await webhookFunctions.getCredentials('jwtAuth');
            extractSecret = () => JwtValidator.extractJwtAuthSecret(credentials);
        } catch {
            // Credentials not configured but JWT validation requested
            return {
                isValid: false,
                error: {
                    status: 401,
                    error: 'Unauthorized',
                    message: 'Enreach API credentials not configured'
                }
            };
        }
    }

    // Validate JWT
    try {
        const jwtSecret = extractSecret();
        const isValid = JwtValidator.validateJWT(jwt, jwtSecret);

        if (!isValid) {
            return {
                isValid: false,
                error: {
                    status: 401,
                    error: 'Unauthorized',
                    message: 'Invalid or expired JWT token'
                }
            };
        }

        return { isValid: true };
    } catch {
        return {
            isValid: false,
            error: {
                status: 401,
                error: 'Authentication failed',
                message: 'JWT validation error'
            }
        };
    }
}