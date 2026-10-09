// Test doubles are partial stubs of n8n interfaces, so `any` is intentional here.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from '@jest/globals';
import { validateWebhookAuth } from '../../nodes/utils/webhookAuth';
import { createValidJWT } from '../helpers';

describe('webhookAuth', () => {
	const SECRET = 'test-secret-key';

	const createMockWebhookFunctions = (credentials?: any) => {
		return {
			getCredentials: jest.fn(async () => {
				if (credentials === null) {
					throw new Error('Credentials not found');
				}
				return credentials || { jwtSecret: SECRET };
			}),
		} as any;
	};

	describe('validateWebhookAuth', () => {
		describe('None authentication', () => {
			it('should return valid for none auth method', async () => {
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, undefined, 'none');

				expect(result.isValid).toBe(true);
				expect(result.error).toBeUndefined();
			});

			it('should not check JWT when auth method is none', async () => {
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, 'invalid-jwt', 'none');

				expect(result.isValid).toBe(true);
			});
		});

		describe('JWT authentication', () => {
			it('should validate correct JWT token', async () => {
				const payload = { userId: '123', exp: Math.floor(Date.now() / 1000) + 3600 };
				const token = createValidJWT(payload, SECRET);
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(true);
			});

			it('should reject when JWT is missing', async () => {
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, undefined, 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error).toEqual({
					status: 401,
					error: 'Unauthorized',
					message: 'JWT token missing in Authorization header',
				});
			});

			it('should reject when JWT is empty string', async () => {
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, '', 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error?.message).toBe('JWT token missing in Authorization header');
			});

			it('should reject when credentials are not configured', async () => {
				const mockFunctions = createMockWebhookFunctions(null);
				const token = createValidJWT({ userId: '123' }, SECRET);

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error).toEqual({
					status: 401,
					error: 'Unauthorized',
					message: 'Enreach API credentials not configured',
				});
			});

			it('should reject invalid JWT signature', async () => {
				const token = createValidJWT({ userId: '123' }, 'wrong-secret');
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error).toEqual({
					status: 401,
					error: 'Unauthorized',
					message: 'Invalid or expired JWT token',
				});
			});

			it('should reject expired JWT token', async () => {
				const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
				const payload = { userId: '123', exp: pastTime };
				const token = createValidJWT(payload, SECRET);
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error?.message).toBe('Invalid or expired JWT token');
			});

			it('should reject malformed JWT token', async () => {
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, 'invalid.jwt.token', 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error?.status).toBe(401);
			});

			it('should handle JWT validation errors gracefully', async () => {
				const mockFunctions = createMockWebhookFunctions({ jwtSecret: '' }); // Empty secret
				const token = createValidJWT({ userId: '123' }, SECRET);

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		describe('Edge cases', () => {
			it('should handle undefined authMethod (requires JWT)', async () => {
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, undefined, undefined);

				// When authMethod is undefined, it should require JWT
				expect(result.isValid).toBe(false);
				expect(result.error?.message).toBe('JWT token missing in Authorization header');
			});

			it('should handle JWT with special characters', async () => {
				const futureTime = Math.floor(Date.now() / 1000) + 3600;
				const payload = { name: '日本語', emoji: '🎉', exp: futureTime };
				const token = createValidJWT(payload, SECRET);
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(true);
			});

			it('should handle very long JWT token', async () => {
				const payload = {
					data: 'a'.repeat(10000),
					exp: Math.floor(Date.now() / 1000) + 3600,
				};
				const token = createValidJWT(payload, SECRET);
				const mockFunctions = createMockWebhookFunctions();

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(true);
			});

			it('should return authentication failed for unexpected errors', async () => {
				const mockFunctions = {
					getCredentials: jest.fn(async () => {
						throw new Error('Unexpected error');
					}),
				} as any;
				const token = createValidJWT({ userId: '123' }, SECRET);

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error?.error).toBe('Unauthorized');
			});

			it('should handle credentials with missing jwtSecret field', async () => {
				const mockFunctions = createMockWebhookFunctions({});
				const token = createValidJWT({ userId: '123' }, SECRET);

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error).toBeDefined();
			});
		});

		describe('Built-in JWT Auth credentials (older workflows)', () => {
			const JWT_AUTH_SECRET = 'jwt-auth-secret';

			const createMockWithCredentials = (byType: Record<string, any>) => ({
				getCredentials: jest.fn(async (type: string) => {
					if (!(type in byType)) {
						throw new Error(`Node does not have any credentials set for "${type}"`);
					}
					return byType[type];
				}),
			}) as any;

			it('should validate with the jwtAuth secret when no Enreach API credentials are set', async () => {
				const token = createValidJWT({ sub: 'istra' }, JWT_AUTH_SECRET);
				const mockFunctions = createMockWithCredentials({
					jwtAuth: { keyType: 'passphrase', secret: JWT_AUTH_SECRET, algorithm: 'HS256' },
				});

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(true);
				expect(mockFunctions.getCredentials).toHaveBeenCalledWith('enreachApi');
				expect(mockFunctions.getCredentials).toHaveBeenCalledWith('jwtAuth');
			});

			it('should prefer Enreach API credentials when both are set', async () => {
				const token = createValidJWT({ sub: 'istra' }, SECRET);
				const mockFunctions = createMockWithCredentials({
					enreachApi: { jwtSecret: SECRET },
					jwtAuth: { keyType: 'passphrase', secret: JWT_AUTH_SECRET },
				});

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(true);
				expect(mockFunctions.getCredentials).not.toHaveBeenCalledWith('jwtAuth');
			});

			it('should reject a token signed with another secret', async () => {
				const token = createValidJWT({ sub: 'istra' }, 'other-secret');
				const mockFunctions = createMockWithCredentials({
					jwtAuth: { keyType: 'passphrase', secret: JWT_AUTH_SECRET },
				});

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.error?.message).toBe('Invalid or expired JWT token');
			});

			it('should fail with a validation error for PEM key credentials', async () => {
				const token = createValidJWT({ sub: 'istra' }, JWT_AUTH_SECRET);
				const mockFunctions = createMockWithCredentials({
					jwtAuth: { keyType: 'pemKey', publicKey: '-----BEGIN PUBLIC KEY-----' },
				});

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.isValid).toBe(false);
				expect(result.error?.message).toBe('JWT validation error');
			});

			it('should reject when neither credential type is set', async () => {
				const token = createValidJWT({ sub: 'istra' }, SECRET);
				const mockFunctions = createMockWithCredentials({});

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.error?.message).toBe('Enreach API credentials not configured');
			});
		});

		describe('Security tests', () => {
			it('should not leak secret in error messages', async () => {
				const mockFunctions = createMockWebhookFunctions();
				const token = 'invalid-token';

				const result = await validateWebhookAuth(mockFunctions, token, 'jwtAuth');

				expect(result.error?.message).not.toContain(SECRET);
			});

			it('should return 401 status for all auth failures', async () => {
				const mockFunctions = createMockWebhookFunctions();
				const testCases = [
					{ jwt: undefined, authMethod: 'jwtAuth' },
					{ jwt: 'invalid', authMethod: 'jwtAuth' },
					{ jwt: '', authMethod: 'jwtAuth' },
				];

				for (const testCase of testCases) {
					const result = await validateWebhookAuth(
						mockFunctions,
						testCase.jwt,
						testCase.authMethod
					);
					expect(result.error?.status).toBe(401);
				}
			});
		});
	});
});
