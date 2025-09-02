import crypto from 'crypto';
import { IDataObject } from 'n8n-workflow';

/**
 * Simple JWT validation for Enreach webhooks
 */
export class JwtValidator {
    /**
     * Validate JWT token structure and signature
     */
    static validateJWT(token: string, secret: string, validateExpiry: boolean = false): boolean {
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

            // Optionally validate expiry
            if (validateExpiry) {
                const payloadData = JSON.parse(Buffer.from(payload, 'base64url').toString());
                
                if (payloadData.exp) {
                    const now = Math.floor(Date.now() / 1000);
                    if (payloadData.exp < now) {
                        return false; // Token expired
                    }
                }
            }

            return true;
        } catch (error) {
            // JWT validation error
            return false;
        }
    }

    /**
     * Extract JWT from Authorization header or body
     */
    static extractJWT(authHeader?: string, bodyJwt?: string): string | null {
        // Check Authorization header first (Bearer token)
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        
        // Fall back to JWT in body (Enreach style)
        if (bodyJwt) {
            return bodyJwt;
        }

        return null;
    }

    /**
     * Decode JWT payload without validation (for debugging)
     */
    static decodeJWT(token: string): IDataObject | null {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                return null;
            }
            
            const payload = Buffer.from(parts[1], 'base64url').toString();
            return JSON.parse(payload);
        } catch (error) {
            return null;
        }
    }

    /**
     * Extract JWT secret from n8n credentials based on key type
     */
    static extractJwtSecret(credentials: IDataObject): string {
        const keyType = credentials.keyType as string;
        
        if (keyType === 'passphrase') {
            return credentials.secret as string;
        } else if (keyType === 'pemKey') {
            return credentials.publicKey as string;
        }
        
        return credentials.secret as string;
    }
}