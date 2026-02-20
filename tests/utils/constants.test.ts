import { describe, it, expect } from '@jest/globals';
import { ENREACH_LIMITS, TIMEOUT_CONFIG, TIME_UNITS, MESSAGE_TYPES } from '../../nodes/utils/constants';

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

	describe('TIMEOUT_CONFIG', () => {
		it('should have default wait years', () => {
			expect(TIMEOUT_CONFIG.DEFAULT_WAIT_YEARS).toBe(1);
		});

		it('should have processing buffer in milliseconds', () => {
			expect(TIMEOUT_CONFIG.PROCESSING_BUFFER_MS).toBe(1000);
		});

		it('should have minimum timeout in milliseconds', () => {
			expect(TIMEOUT_CONFIG.MIN_TIMEOUT_MS).toBe(1000);
		});

		it('should have positive values', () => {
			expect(TIMEOUT_CONFIG.DEFAULT_WAIT_YEARS).toBeGreaterThan(0);
			expect(TIMEOUT_CONFIG.PROCESSING_BUFFER_MS).toBeGreaterThan(0);
			expect(TIMEOUT_CONFIG.MIN_TIMEOUT_MS).toBeGreaterThan(0);
		});
	});

	describe('TIME_UNITS', () => {
		it('should have correct seconds conversion', () => {
			expect(TIME_UNITS.seconds).toBe(1000);
		});

		it('should have correct minutes conversion', () => {
			expect(TIME_UNITS.minutes).toBe(60 * 1000);
		});

		it('should have correct hours conversion', () => {
			expect(TIME_UNITS.hours).toBe(60 * 60 * 1000);
		});

		it('should have correct days conversion', () => {
			expect(TIME_UNITS.days).toBe(24 * 60 * 60 * 1000);
		});

		it('should have all time units in correct order', () => {
			expect(TIME_UNITS.seconds).toBeLessThan(TIME_UNITS.minutes);
			expect(TIME_UNITS.minutes).toBeLessThan(TIME_UNITS.hours);
			expect(TIME_UNITS.hours).toBeLessThan(TIME_UNITS.days);
		});

		it('should calculate 1 day correctly', () => {
			const oneDayInMs = 24 * 60 * 60 * 1000;
			expect(TIME_UNITS.days).toBe(oneDayInMs);
		});

		it('should calculate 1 hour correctly', () => {
			const oneHourInMs = 60 * 60 * 1000;
			expect(TIME_UNITS.hours).toBe(oneHourInMs);
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

		it('should allow calculating timeout in milliseconds', () => {
			const hours = 2;
			const timeoutMs = hours * TIME_UNITS.hours;
			expect(timeoutMs).toBe(7200000); // 2 hours in ms
		});

		it('should allow type comparison', () => {
			const messageType = 'list';
			const isList = messageType === MESSAGE_TYPES.LIST;
			expect(isList).toBe(true);
		});

		it('should calculate 1 year timeout correctly', () => {
			const oneYear = TIMEOUT_CONFIG.DEFAULT_WAIT_YEARS * 365 * TIME_UNITS.days;
			const expectedMs = 365 * 24 * 60 * 60 * 1000;
			expect(oneYear).toBe(expectedMs);
		});
	});
});
