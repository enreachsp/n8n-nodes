import crypto from 'crypto';
import { IDataObject } from 'n8n-workflow';

/**
 * Simple JWT validation for Enreach webhooks
 */
export class JwtValidator {
    /**
     * Validate JWT token structure, signature and expiry
     */
    static validateJWT(token: string, secret: string): boolean {
        try {
            // JWT structure: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) {
                return false;
            }

            const [header, payload, signature] = parts;

            // Verify signature
            const signatureCheck = crypto
                .createHmac('sha256', secret)
                .update(`${header}.${payload}`)
                .digest('base64url');

            if (signature !== signatureCheck) {
                return false;
            }

            // Always validate expiry if present
            const payloadData = JSON.parse(Buffer.from(payload, 'base64url').toString());

            if (payloadData.exp) {
                const now = Math.floor(Date.now() / 1000);
                if (payloadData.exp < now) {
                    return false; // Token expired
                }
            }

            return true;
        } catch (error) {
            // JWT validation error
            return false;
        }
    }

    /**
     * Extract JWT secret from Enreach API credentials
     */
    static extractEnreachSecret(credentials: IDataObject): string {
        const secret = credentials.jwtSecret as string;
        if (!secret || secret.trim() === '') {
            throw new Error('JWT secret is not configured in Enreach API credentials');
        }
        return secret;
    }
}