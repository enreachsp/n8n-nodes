import { JwtValidator } from '../JwtValidator';
import crypto from 'crypto';

describe('JwtValidator - Production Security Tests', () => {
  const secret = 'test-secret-key-for-testing';

  // Helper to create a valid JWT
  function createValidJWT(payload: any, secretKey: string = secret, expiresIn?: number): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

    const payloadData = { ...payload };
    if (expiresIn) {
      payloadData.exp = Math.floor(Date.now() / 1000) + expiresIn;
    }

    const payloadStr = Buffer.from(JSON.stringify(payloadData)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(`${header}.${payloadStr}`)
      .digest('base64url');

    return `${header}.${payloadStr}.${signature}`;
  }

  describe('validateJWT', () => {
    it('should validate a correctly signed JWT', () => {
      const token = createValidJWT({ userId: '123', role: 'user' });
      expect(JwtValidator.validateJWT(token, secret)).toBe(true);
    });

    it('should reject JWT with invalid signature', () => {
      const token = createValidJWT({ userId: '123' });
      expect(JwtValidator.validateJWT(token, 'wrong-secret')).toBe(false);
    });

    it('should reject malformed JWT (missing parts)', () => {
      expect(JwtValidator.validateJWT('invalid.token', secret)).toBe(false);
      expect(JwtValidator.validateJWT('', secret)).toBe(false);
    });

    it('should reject tampered JWT payload', () => {
      const token = createValidJWT({ userId: '123' });
      const parts = token.split('.');
      // Tamper with payload
      parts[1] = Buffer.from(JSON.stringify({ userId: '456' })).toString('base64url');
      const tamperedToken = parts.join('.');

      expect(JwtValidator.validateJWT(tamperedToken, secret)).toBe(false);
    });

    it('should reject expired token (expiry always validated)', () => {
      const token = createValidJWT({ userId: '123' }, secret, -3600); // Expired 1 hour ago
      expect(JwtValidator.validateJWT(token, secret)).toBe(false);
    });

    it('should accept valid token with future expiry', () => {
      const token = createValidJWT({ userId: '123' }, secret, 3600); // Expires in 1 hour
      expect(JwtValidator.validateJWT(token, secret)).toBe(true);
    });

    it('should handle JWT without exp claim (no expiry validation needed)', () => {
      const token = createValidJWT({ userId: '123' });
      expect(JwtValidator.validateJWT(token, secret)).toBe(true);
    });

    it('should handle invalid base64 in JWT gracefully', () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.INVALID_BASE64.signature';
      expect(JwtValidator.validateJWT(invalidToken, secret)).toBe(false);
    });
  });

  describe('extractJWT', () => {
    const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';

    it('should extract JWT from Bearer authorization header', () => {
      const authHeader = `Bearer ${sampleToken}`;
      expect(JwtValidator.extractJWT(authHeader, undefined)).toBe(sampleToken);
    });

    it('should extract JWT from body when no auth header', () => {
      expect(JwtValidator.extractJWT(undefined, sampleToken)).toBe(sampleToken);
    });

    it('should prefer auth header over body JWT', () => {
      const headerToken = 'header.token.sig';
      const bodyToken = 'body.token.sig';
      expect(JwtValidator.extractJWT(`Bearer ${headerToken}`, bodyToken)).toBe(headerToken);
    });

    it('should return null when no JWT found', () => {
      expect(JwtValidator.extractJWT(undefined, undefined)).toBeNull();
      expect(JwtValidator.extractJWT('', '')).toBeNull();
    });

    it('should handle malformed Bearer header', () => {
      expect(JwtValidator.extractJWT('Bearer', undefined)).toBeNull();
      expect(JwtValidator.extractJWT('NotBearer token', undefined)).toBeNull();
    });
  });

  // Removed deprecated extractJwtSecret tests

  describe('extractEnreachSecret', () => {
    it('should extract jwtSecret from credentials', () => {
      const credentials = { jwtSecret: 'my-jwt-secret' };
      expect(JwtValidator.extractEnreachSecret(credentials)).toBe('my-jwt-secret');
    });

    it('should return empty string when no secret available', () => {
      const credentials = {};
      expect(JwtValidator.extractEnreachSecret(credentials)).toBe('');
    });

    it('should handle undefined jwtSecret', () => {
      const credentials = { jwtSecret: undefined };
      expect(JwtValidator.extractEnreachSecret(credentials)).toBe('');
    });
  });

  describe('decodeJWT', () => {
    it('should decode valid JWT payload', () => {
      const payload = { userId: '123', role: 'admin' };
      const token = createValidJWT(payload);
      const decoded = JwtValidator.decodeJWT(token);

      expect(decoded).toMatchObject(payload);
    });

    it('should return null for invalid JWT', () => {
      expect(JwtValidator.decodeJWT('invalid')).toBeNull();
      expect(JwtValidator.decodeJWT('')).toBeNull();
    });
  });
});