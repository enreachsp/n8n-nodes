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
    jwt: string | undefined
): Promise<WebhookAuthResult> {
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

    // Get credentials
    const credentials = await webhookFunctions.getCredentials('enreachApi');
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