import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import crypto from 'crypto';
import { JwtValidator } from '../../nodes/utils/JwtValidator';
import { createValidJWT } from '../helpers';

describe('JwtValidator', () => {
	const SECRET = 'test-secret-key-123';

	// Convenience wrapper with default secret
	const makeJWT = (payload: any, secret: string = SECRET): string => createValidJWT(payload, secret);

	// TEST-02: Use fake timers for deterministic time-dependent tests
	beforeEach(() => { jest.useFakeTimers(); });
	afterEach(() => { jest.useRealTimers(); });

	describe('validateJWT', () => {
		it('should accept a valid JWT token without expiry claim', () => {
			const payload = { userId: '123', iat: 1516239022 };
			const token = makeJWT(payload);

			const result = JwtValidator.validateJWT(token, SECRET);

			// SEC-02: exp is optional, like n8n's native JWT Auth webhook
			expect(result).toBe(true);
		});

		it('should validate a valid JWT token with future expiry', () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
			const payload = { userId: '123', exp: futureTime };
			const token = makeJWT(payload);

			const result = JwtValidator.validateJWT(token, SECRET);

			expect(result).toBe(true);
		});

		it('should reject JWT token with past expiry', () => {
			const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
			const payload = { userId: '123', exp: pastTime };
			const token = makeJWT(payload);

			const result = JwtValidator.validateJWT(token, SECRET);

			expect(result).toBe(false);
		});

		it('should reject JWT token with invalid signature', () => {
			const payload = { userId: '123' };
			const token = makeJWT(payload, SECRET);
			const wrongSecret = 'wrong-secret';

			const result = JwtValidator.validateJWT(token, wrongSecret);

			expect(result).toBe(false);
		});

		it('should reject JWT token with wrong structure (missing parts)', () => {
			const invalidToken = 'header.payload'; // Missing signature

			const result = JwtValidator.validateJWT(invalidToken, SECRET);

			expect(result).toBe(false);
		});

		it('should reject JWT token with too many parts', () => {
			const invalidToken = 'header.payload.signature.extra';

			const result = JwtValidator.validateJWT(invalidToken, SECRET);

			expect(result).toBe(false);
		});

		it('should reject empty JWT token', () => {
			const result = JwtValidator.validateJWT('', SECRET);

			expect(result).toBe(false);
		});

		it('should reject JWT with tampered payload', () => {
			const payload = { userId: '123' };
			const token = makeJWT(payload);

			// Tamper with the payload
			const parts = token.split('.');
			const tamperedPayload = Buffer.from(JSON.stringify({ userId: '999' })).toString('base64url');
			const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

			const result = JwtValidator.validateJWT(tamperedToken, SECRET);

			expect(result).toBe(false);
		});

		it('should reject JWT with invalid base64url encoding', () => {
			const invalidToken = 'invalid!!!.base64url.encoding';

			const result = JwtValidator.validateJWT(invalidToken, SECRET);

			expect(result).toBe(false);
		});

		it('should accept JWT with expiry exactly at current time (within clock tolerance)', () => {
			const currentTime = Math.floor(Date.now() / 1000);
			const payload = { userId: '123', exp: currentTime };
			const token = makeJWT(payload);

			const result = JwtValidator.validateJWT(token, SECRET);

			// exp <= now but within 30s clock tolerance, so still valid
			expect(result).toBe(true);
		});

		it('should validate JWT with additional custom claims and exp', () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const payload = {
				userId: '123',
				role: 'admin',
				permissions: ['read', 'write'],
				metadata: { foo: 'bar' },
				exp: futureTime,
			};
			const token = makeJWT(payload);

			const result = JwtValidator.validateJWT(token, SECRET);

			expect(result).toBe(true);
		});

		it('should reject JWT with malformed JSON in payload', () => {
			const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
			const malformedPayload = Buffer.from('{invalid json}').toString('base64url');
			const signature = crypto
				.createHmac('sha256', SECRET)
				.update(`${header}.${malformedPayload}`)
				.digest('base64url');

			const token = `${header}.${malformedPayload}.${signature}`;

			const result = JwtValidator.validateJWT(token, SECRET);

			expect(result).toBe(false);
		});
	});

	describe('extractEnreachSecret', () => {
		it('should extract JWT secret from credentials', () => {
			const credentials = { jwtSecret: 'my-secret-123' };

			const result = JwtValidator.extractEnreachSecret(credentials);

			expect(result).toBe('my-secret-123');
		});

		it('should throw error when JWT secret is missing', () => {
			const credentials = {};

			expect(() => {
				JwtValidator.extractEnreachSecret(credentials);
			}).toThrow('JWT secret is not configured in Enreach API credentials');
		});

		it('should throw error when JWT secret is empty string', () => {
			const credentials = { jwtSecret: '' };

			expect(() => {
				JwtValidator.extractEnreachSecret(credentials);
			}).toThrow('JWT secret is not configured in Enreach API credentials');
		});

		it('should throw error when JWT secret is only whitespace', () => {
			const credentials = { jwtSecret: '   ' };

			expect(() => {
				JwtValidator.extractEnreachSecret(credentials);
			}).toThrow('JWT secret is not configured in Enreach API credentials');
		});

		it('should accept JWT secret with spaces in the middle', () => {
			const credentials = { jwtSecret: 'secret with spaces' };

			const result = JwtValidator.extractEnreachSecret(credentials);

			expect(result).toBe('secret with spaces');
		});
	});

	describe('Integration tests', () => {
		it('should validate real-world JWT structure', () => {
			const payload = {
				sub: '1234567890',
				name: 'John Doe',
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 3600,
			};
			const token = makeJWT(payload);

			const result = JwtValidator.validateJWT(token, SECRET);

			expect(result).toBe(true);
		});

		it('should handle JWT with very long secret', () => {
			const longSecret = 'a'.repeat(1000);
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const payload = { userId: '123', exp: futureTime };
			const token = makeJWT(payload, longSecret);

			const result = JwtValidator.validateJWT(token, longSecret);

			expect(result).toBe(true);
		});

		it('should handle JWT with unicode characters in payload', () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const payload = {
				name: '日本語',
				emoji: '🎉',
				text: 'Héllo Wörld',
				exp: futureTime,
			};
			const token = makeJWT(payload);

			const result = JwtValidator.validateJWT(token, SECRET);

			expect(result).toBe(true);
		});
	});

	describe('Security hardening', () => {
		it('should reject JWT with alg:none header', () => {
			const header = { alg: 'none', typ: 'JWT' };
			const payload = { userId: '123', exp: Math.floor(Date.now() / 1000) + 3600 };
			const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
			const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
			const token = `${headerEncoded}.${payloadEncoded}.`;

			expect(JwtValidator.validateJWT(token, SECRET)).toBe(false);
		});

		it('should reject JWT with alg:RS256 header', () => {
			const header = { alg: 'RS256', typ: 'JWT' };
			const payload = { userId: '123', exp: Math.floor(Date.now() / 1000) + 3600 };
			const headerEncoded = Buffer.from(JSON.stringify(header)).toString('base64url');
			const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
			const signature = crypto
				.createHmac('sha256', SECRET)
				.update(`${headerEncoded}.${payloadEncoded}`)
				.digest('base64url');
			const token = `${headerEncoded}.${payloadEncoded}.${signature}`;

			expect(JwtValidator.validateJWT(token, SECRET)).toBe(false);
		});

		it('should reject JWT with exp: 0 (epoch bypass)', () => {
			const payload = { userId: '123', exp: 0 };
			const token = makeJWT(payload);

			expect(JwtValidator.validateJWT(token, SECRET)).toBe(false);
		});

		it('should reject JWT with exp as string', () => {
			const payload = { userId: '123', exp: 'not-a-number' };
			const token = makeJWT(payload);

			expect(JwtValidator.validateJWT(token, SECRET)).toBe(false);
		});

		it('should accept JWT expired within clock tolerance (30s)', () => {
			// Token expired 10 seconds ago -- within 30s tolerance
			const recentPast = Math.floor(Date.now() / 1000) - 10;
			const payload = { userId: '123', exp: recentPast };
			const token = makeJWT(payload);

			expect(JwtValidator.validateJWT(token, SECRET)).toBe(true);
		});

		it('should reject JWT expired beyond clock tolerance', () => {
			// Token expired 60 seconds ago -- beyond 30s tolerance
			const pastTime = Math.floor(Date.now() / 1000) - 60;
			const payload = { userId: '123', exp: pastTime };
			const token = makeJWT(payload);

			expect(JwtValidator.validateJWT(token, SECRET)).toBe(false);
		});

		it('should reject oversized JWT tokens', () => {
			const result = JwtValidator.validateJWT('a'.repeat(20000), SECRET);

			expect(result).toBe(false);
		});
	});
});
