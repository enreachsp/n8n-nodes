// Test doubles are partial stubs of n8n interfaces, so `any` is intentional here.
/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';

/**
 * Create a valid JWT token for testing purposes
 */
export function createValidJWT(payload: any, secret: string): string {
	const header = { alg: 'HS256', typ: 'JWT' };
	const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
	const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');

	const signature = crypto
		.createHmac('sha256', secret)
		.update(`${headerEncoded}.${payloadEncoded}`)
		.digest('base64url');

	return `${headerEncoded}.${payloadEncoded}.${signature}`;
}
