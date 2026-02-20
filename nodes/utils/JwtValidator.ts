import crypto from 'crypto';
import { IDataObject } from 'n8n-workflow';

/**
 * JWT validation for Enreach webhooks using HMAC-SHA256
 */
export class JwtValidator {
    private static readonly CLOCK_TOLERANCE_SECONDS = 30;

    /**
     * Validate JWT token structure, algorithm, signature and expiry
     */
    static validateJWT(token: string, secret: string): boolean {
        try {
            // Reject oversized tokens to prevent DoS
            if (!token || token.length > 16384) {
                return false;
            }

            // JWT structure: header.payload.signature
            const parts = token.split('.');
            if (parts.length !== 3) {
                return false;
            }

            const [header, payload, signature] = parts;

            // SEC-03: Validate algorithm from header -- only HS256 is accepted
            const headerData = JSON.parse(Buffer.from(header, 'base64url').toString());
            if (headerData.alg !== 'HS256') {
                return false;
            }

            // Verify signature using timing-safe comparison (SEC-01)
            const signatureCheck = crypto
                .createHmac('sha256', secret)
                .update(`${header}.${payload}`)
                .digest('base64url');

            const sigBuffer = Buffer.from(signature, 'base64url');
            const checkBuffer = Buffer.from(signatureCheck, 'base64url');
            if (sigBuffer.length !== checkBuffer.length || !crypto.timingSafeEqual(sigBuffer, checkBuffer)) {
                return false;
            }

            // SEC-02: Validate expiry -- exp claim is required
            const payloadData = JSON.parse(Buffer.from(payload, 'base64url').toString());

            if (typeof payloadData.exp !== 'number') {
                return false; // Reject tokens without expiry
            }

            const now = Math.floor(Date.now() / 1000);
            if (payloadData.exp <= now - JwtValidator.CLOCK_TOLERANCE_SECONDS) {
                return false; // Token expired (with clock skew tolerance)
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