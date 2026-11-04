import { describe, it, expect } from '@jest/globals';
import { ENREACH_LIMITS, MESSAGE_TYPES } from '../../nodes/utils/constants';

describe('Constants', () => {
	describe('ENREACH_LIMITS', () => {
		it('should have correct text max length', () => {
			expect(ENREACH_LIMITS.TEXT_MAX_LENGTH).toBe(1024);
		});

		it('should have correct button title max length', () => {
			expect(ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH).toBe(20);
		});

		it('should have correct list min options', () => {
			expect(ENREACH_LIMITS.LIST_MIN_OPTIONS).toBe(3);
		});

		it('should have correct list max options', () => {
			expect(ENREACH_LIMITS.LIST_MAX_OPTIONS).toBe(10);
		});

		it('should have all required fields', () => {
			expect(ENREACH_LIMITS).toHaveProperty('TEXT_MAX_LENGTH');
			expect(ENREACH_LIMITS).toHaveProperty('BUTTON_TITLE_MAX_LENGTH');
			expect(ENREACH_LIMITS).toHaveProperty('LIST_MIN_OPTIONS');
			expect(ENREACH_LIMITS).toHaveProperty('LIST_MAX_OPTIONS');
		});
	});

	describe('MESSAGE_TYPES', () => {
		it('should have text message type', () => {
			expect(MESSAGE_TYPES.TEXT).toBe('text');
		});

		it('should have button message type', () => {
			expect(MESSAGE_TYPES.BUTTON).toBe('button');
		});

		it('should have list message type', () => {
			expect(MESSAGE_TYPES.LIST).toBe('list');
		});

		it('should have annotation message type', () => {
			expect(MESSAGE_TYPES.ANNOTATION).toBe('annotation');
		});

		it('should have all unique values', () => {
			const values = Object.values(MESSAGE_TYPES);
			const uniqueValues = new Set(values);
			expect(uniqueValues.size).toBe(values.length);
		});

		it('should have lowercase values', () => {
			Object.values(MESSAGE_TYPES).forEach((type) => {
				expect(type).toBe(type.toLowerCase());
			});
		});
	});

	describe('Realistic usage scenarios', () => {
		it('should allow checking if text exceeds limit', () => {
			const text = 'a'.repeat(1500);
			const exceeds = text.length > ENREACH_LIMITS.TEXT_MAX_LENGTH;
			expect(exceeds).toBe(true);
		});

		it('should allow type comparison', () => {
			const messageType = 'list';
			const isList = messageType === MESSAGE_TYPES.LIST;
			expect(isList).toBe(true);
		});
	});
});
