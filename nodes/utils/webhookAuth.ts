import { IWebhookFunctions } from 'n8n-workflow';
import { JwtValidator } from './JwtValidator';

export interface WebhookAuthResult {
    isValid: boolean;
    error?: {
        status: number;
        message: string;
        error: string;
    };
    jwtSecret?: string;
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

    // Check JWT exists
    if (!jwt) {
        return {
            isValid: false,
            error: {
                status: 401,
                error: 'Unauthorized',
                message: 'JWT token missing in request'
            }
        };
    }

    // Get credentials - they might not be configured if auth is disabled
    let credentials;
    try {
        credentials = await webhookFunctions.getCredentials('enreachApi');
    } catch (error) {
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

    if (!credentials) {
        return {
            isValid: false,
            error: {
                status: 401,
                error: 'Unauthorized',
                message: 'Enreach API credentials not configured'
            }
        };
    }

    // Validate JWT
    try {
        const jwtSecret = JwtValidator.extractEnreachSecret(credentials);
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

        return { isValid: true, jwtSecret };
    } catch (error) {
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