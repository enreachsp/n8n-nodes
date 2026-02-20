import { describe, it, expect, jest } from '@jest/globals';
import { EnreachErrorCode, EnreachNodeError, createUserFriendlyError } from '../../nodes/utils/errors';

// Mock IExecuteFunctions for testing
const createMockExecuteFunctions = () => {
	return {
		getNode: jest.fn(() => ({
			name: 'Test Node',
			type: 'n8n-nodes-enreach.enreach',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		})),
	} as any;
};

describe('Errors', () => {
	describe('EnreachErrorCode enum', () => {
		it('should have all expected error codes', () => {
			expect(EnreachErrorCode.CONFIG_MISSING_TRIGGER).toBe('CONFIG_MISSING_TRIGGER');
			expect(EnreachErrorCode.VALIDATION_TEXT_TOO_LONG).toBe('VALIDATION_TEXT_TOO_LONG');
			expect(EnreachErrorCode.VALIDATION_TITLE_TOO_LONG).toBe('VALIDATION_TITLE_TOO_LONG');
			expect(EnreachErrorCode.VALIDATION_INSUFFICIENT_OPTIONS).toBe('VALIDATION_INSUFFICIENT_OPTIONS');
			expect(EnreachErrorCode.VALIDATION_TOO_MANY_OPTIONS).toBe('VALIDATION_TOO_MANY_OPTIONS');
		});
	});

	describe('EnreachNodeError', () => {
		it('should create error with message and code', () => {
			const mockExecute = createMockExecuteFunctions();
			const error = new EnreachNodeError(
				mockExecute,
				'Test error message',
				EnreachErrorCode.VALIDATION_TEXT_TOO_LONG
			);

			expect(error.message).toBe('Test error message');
			expect(error.name).toBe('EnreachNodeError');
			expect(error.errorCode).toBe(EnreachErrorCode.VALIDATION_TEXT_TOO_LONG);
		});

		it('should include description in error', () => {
			const mockExecute = createMockExecuteFunctions();
			const error = new EnreachNodeError(
				mockExecute,
				'Test message',
				EnreachErrorCode.CONFIG_MISSING_TRIGGER,
				'Custom description'
			);

			expect(error.message).toBe('Test message');
			expect(error.description).toBe('Custom description');
		});

		it('should include item index when provided', () => {
			const mockExecute = createMockExecuteFunctions();
			const error = new EnreachNodeError(
				mockExecute,
				'Test message',
				EnreachErrorCode.VALIDATION_TEXT_TOO_LONG,
				undefined,
				5
			);

			expect(error.message).toBe('Test message');
			expect(error.context).toBeDefined();
		});
	});

	describe('createUserFriendlyError', () => {
		let mockExecute: any;

		beforeEach(() => {
			mockExecute = createMockExecuteFunctions();
		});

		describe('VALIDATION_TEXT_TOO_LONG', () => {
			it('should create user-friendly error for text too long', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.VALIDATION_TEXT_TOO_LONG,
					{ length: 1500, max: 1024 }
				);

				expect(error.message).toContain('1500 characters');
				expect(error.message).toContain('1024 characters');
				expect(error.message).toContain('too long');
			});
		});

		describe('VALIDATION_TITLE_TOO_LONG', () => {
			it('should create user-friendly error for title too long', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.VALIDATION_TITLE_TOO_LONG,
					{ title: 'Very Long Button Title', length: 25, max: 20 }
				);

				expect(error.message).toContain('Very Long Button Title');
				expect(error.message).toContain('25 characters');
				expect(error.message).toContain('20 characters');
				expect(error.message).toContain('too long');
			});
		});

		describe('VALIDATION_INSUFFICIENT_OPTIONS', () => {
			it('should create user-friendly error for insufficient options', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.VALIDATION_INSUFFICIENT_OPTIONS,
					{ min: 3, current: 2 }
				);

				expect(error.message).toContain('at least 3 options');
				expect(error.message).toContain('only 2 provided');
			});
		});

		describe('VALIDATION_TOO_MANY_OPTIONS', () => {
			it('should create user-friendly error for too many options', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.VALIDATION_TOO_MANY_OPTIONS,
					{ current: 15, max: 10 }
				);

				expect(error.message).toContain('Too many options');
				expect(error.message).toContain('15');
				expect(error.message).toContain('10');
			});
		});

		describe('CONFIG_MISSING_TRIGGER', () => {
			it('should create user-friendly error for missing trigger', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.CONFIG_MISSING_TRIGGER,
					{ nodeName: 'Enreach Trigger' }
				);

				expect(error.message).toContain('Cannot find trigger node');
				expect(error.message).toContain('Enreach Trigger');
			});

			it('should handle custom trigger node name', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.CONFIG_MISSING_TRIGGER,
					{ nodeName: 'My Custom Trigger' }
				);

				expect(error.message).toContain('My Custom Trigger');
			});
		});

		describe('Error with item index', () => {
			it('should include item index in error', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.VALIDATION_TEXT_TOO_LONG,
					{ length: 1500, max: 1024 },
					3
				);

				expect(error.message).toBeDefined();
			});
		});

		describe('Edge cases', () => {
			it('should handle missing details gracefully', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.VALIDATION_TEXT_TOO_LONG,
					{}
				);

				expect(error.message).toBeDefined();
			});

			it('should handle zero values in details', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.VALIDATION_INSUFFICIENT_OPTIONS,
					{ min: 3, current: 0 }
				);

				expect(error.message).toContain('0 provided');
			});

			it('should handle very large numbers', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.VALIDATION_TEXT_TOO_LONG,
					{ length: 1000000, max: 1024 }
				);

				expect(error.message).toContain('1000000');
			});

			it('should handle special characters in strings', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.VALIDATION_TITLE_TOO_LONG,
					{ title: 'Title with "quotes" & <tags>', length: 30, max: 20 }
				);

				expect(error.message).toContain('Title with "quotes" & <tags>');
			});

			it('should handle unicode characters', () => {
				const error = createUserFriendlyError(
					mockExecute,
					EnreachErrorCode.CONFIG_MISSING_TRIGGER,
					{ nodeName: '日本語トリガー' }
				);

				expect(error.message).toContain('日本語トリガー');
			});
		});
	});

	describe('Error inheritance', () => {
		it('should be instance of Error', () => {
			const mockExecute = createMockExecuteFunctions();
			const error = new EnreachNodeError(
				mockExecute,
				'Test',
				EnreachErrorCode.VALIDATION_TEXT_TOO_LONG
			);

			expect(error).toBeInstanceOf(Error);
		});

		it('should have correct error name', () => {
			const mockExecute = createMockExecuteFunctions();
			const error = new EnreachNodeError(
				mockExecute,
				'Test',
				EnreachErrorCode.VALIDATION_TEXT_TOO_LONG
			);

			expect(error.name).toBe('EnreachNodeError');
		});
	});
});
