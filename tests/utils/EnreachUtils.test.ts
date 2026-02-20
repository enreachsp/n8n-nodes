import { describe, it, expect } from '@jest/globals';
import {
	calculateTimeout,
	validateMessageParameters,
	parseOptions,
	buildMessageBody,
	EnreachOption,
} from '../../nodes/utils/EnreachUtils';
import { MESSAGE_TYPES } from '../../nodes/utils/constants';

describe('EnreachUtils', () => {
	describe('calculateTimeout', () => {
		it('should return undefined when limitWaitTime is false', () => {
			const result = calculateTimeout(false, 'timeInterval', '', 1, 'hours');

			expect(result).toBeUndefined();
		});

		it('should calculate timeout for timeInterval in seconds', () => {
			const result = calculateTimeout(true, 'timeInterval', '', 30, 'seconds');

			expect(result).toBeInstanceOf(Date);
			const diffMs = result!.getTime() - Date.now();
			expect(diffMs).toBeGreaterThan(29000); // At least 29 seconds
			expect(diffMs).toBeLessThan(31000); // At most 31 seconds
		});

		it('should calculate timeout for timeInterval in minutes', () => {
			const result = calculateTimeout(true, 'timeInterval', '', 5, 'minutes');

			expect(result).toBeInstanceOf(Date);
			const diffMs = result!.getTime() - Date.now();
			expect(diffMs).toBeGreaterThan(4 * 60 * 1000); // At least 4 minutes
			expect(diffMs).toBeLessThan(6 * 60 * 1000); // At most 6 minutes
		});

		it('should calculate timeout for timeInterval in hours', () => {
			const result = calculateTimeout(true, 'timeInterval', '', 2, 'hours');

			expect(result).toBeInstanceOf(Date);
			const diffMs = result!.getTime() - Date.now();
			expect(diffMs).toBeGreaterThan(1.9 * 60 * 60 * 1000);
			expect(diffMs).toBeLessThan(2.1 * 60 * 60 * 1000);
		});

		it('should calculate timeout for timeInterval in days', () => {
			const result = calculateTimeout(true, 'timeInterval', '', 1, 'days');

			expect(result).toBeInstanceOf(Date);
			const diffMs = result!.getTime() - Date.now();
			expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000);
			expect(diffMs).toBeLessThan(25 * 60 * 60 * 1000);
		});

		it('should parse and return date for dateTime type', () => {
			const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
			const dateString = futureDate.toISOString();

			const result = calculateTimeout(true, 'dateTime', dateString, 0, '');

			expect(result).toBeInstanceOf(Date);
			expect(result!.getTime()).toBe(futureDate.getTime());
		});

		it('should throw error for invalid dateTime string', () => {
			expect(() => {
				calculateTimeout(true, 'dateTime', 'invalid-date', 0, '');
			}).toThrow('Invalid date/time value');
		});

		it('should handle zero amount for timeInterval', () => {
			const result = calculateTimeout(true, 'timeInterval', '', 0, 'hours');

			expect(result).toBeInstanceOf(Date);
			const diffMs = result!.getTime() - Date.now();
			expect(diffMs).toBeLessThan(1000); // Should be very close to now
		});

		it('should handle large amounts correctly', () => {
			const result = calculateTimeout(true, 'timeInterval', '', 365, 'days');

			expect(result).toBeInstanceOf(Date);
			const diffMs = result!.getTime() - Date.now();
			const expectedMs = 365 * 24 * 60 * 60 * 1000;
			expect(diffMs).toBeGreaterThan(expectedMs * 0.99);
			expect(diffMs).toBeLessThan(expectedMs * 1.01);
		});
	});

	describe('validateMessageParameters', () => {
		const validOptions: EnreachOption[] = [
			{ id: '1', title: 'Option 1', description: 'First' },
			{ id: '2', title: 'Option 2', description: 'Second' },
			{ id: '3', title: 'Option 3', description: 'Third' },
		];

		describe('Text validation', () => {
			it('should accept text within limit for list type', () => {
				const text = 'a'.repeat(1000); // Under 1024 limit

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.LIST, text, 'Select', validOptions);
				}).not.toThrow();
			});

			it('should accept text within limit for button type', () => {
				const text = 'a'.repeat(1000);

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.BUTTON, text, undefined, validOptions);
				}).not.toThrow();
			});

			it('should throw error for text exceeding limit in list type', () => {
				const text = 'a'.repeat(1025);

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.LIST, text, 'Select', validOptions);
				}).toThrow('too long');
			});

			it('should throw error for text exceeding limit in button type', () => {
				const text = 'a'.repeat(1025);

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.BUTTON, text, undefined, validOptions);
				}).toThrow('too long');
			});

			it('should allow any text length for text type', () => {
				const text = 'a'.repeat(5000);

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.TEXT, text, undefined, []);
				}).not.toThrow();
			});

			it('should allow any text length for annotation type', () => {
				const text = 'a'.repeat(5000);

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.ANNOTATION, text, undefined, []);
				}).not.toThrow();
			});
		});

		describe('Button title validation', () => {
			it('should accept button title within limit', () => {
				const buttonTitle = 'Select option';

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.LIST, 'Text', buttonTitle, validOptions);
				}).not.toThrow();
			});

			it('should throw error for button title exceeding limit', () => {
				const buttonTitle = 'a'.repeat(21);

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.LIST, 'Text', buttonTitle, validOptions);
				}).toThrow('Button title is too long');
			});

			it('should accept button title at exact limit', () => {
				const buttonTitle = 'a'.repeat(20);

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.LIST, 'Text', buttonTitle, validOptions);
				}).not.toThrow();
			});
		});

		describe('Options validation', () => {
			it('should accept 10 options for list type', () => {
				const options = Array.from({ length: 10 }, (_, i) => ({
					id: `${i}`,
					title: `Option ${i}`,
				}));

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.LIST, 'Text', 'Select', options);
				}).not.toThrow();
			});

			it('should throw error for more than 10 options in list type', () => {
				const options = Array.from({ length: 11 }, (_, i) => ({
					id: `${i}`,
					title: `Option ${i}`,
				}));

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.LIST, 'Text', 'Select', options);
				}).toThrow('Too many options');
			});

			it('should throw error for option ID exceeding 256 characters', () => {
				const options: EnreachOption[] = [
					{ id: 'a'.repeat(257), title: 'Option 1' },
					{ id: '2', title: 'Option 2' },
					{ id: '3', title: 'Option 3' },
				];

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.LIST, 'Text', 'Select', options);
				}).toThrow('Option 1 ID is too long');
			});

			it('should throw error for button option title exceeding 20 characters', () => {
				const options: EnreachOption[] = [
					{ id: '1', title: 'a'.repeat(21) },
					{ id: '2', title: 'Option 2' },
				];

				expect(() => {
					validateMessageParameters(MESSAGE_TYPES.BUTTON, 'Text', undefined, options);
				}).toThrow('Option 1 title is too long');
			});
		});
	});

	describe('parseOptions', () => {
		describe('JSON mode', () => {
			it('should parse valid JSON string', () => {
				const jsonString = JSON.stringify([
					{ id: '1', title: 'Option 1' },
					{ id: '2', title: 'Option 2' },
					{ id: '3', title: 'Option 3' },
				]);

				const result = parseOptions(jsonString, MESSAGE_TYPES.LIST, false);

				expect(result).toHaveLength(3);
				expect(result[0]).toEqual({ id: '1', title: 'Option 1' });
			});

			it('should parse array directly', () => {
				const options = [
					{ id: '1', title: 'Option 1' },
					{ id: '2', title: 'Option 2' },
					{ id: '3', title: 'Option 3' },
				];

				const result = parseOptions(options, MESSAGE_TYPES.LIST, false);

				expect(result).toHaveLength(3);
				expect(result).toEqual(options);
			});

			it('should throw error for invalid JSON', () => {
				const invalidJson = '{ invalid json }';

				expect(() => {
					parseOptions(invalidJson, MESSAGE_TYPES.LIST, false);
				}).toThrow('Failed to parse options JSON');
			});

			it('should throw error for insufficient options in list type', () => {
				const options = [
					{ id: '1', title: 'Option 1' },
					{ id: '2', title: 'Option 2' },
				];

				expect(() => {
					parseOptions(options, MESSAGE_TYPES.LIST, false);
				}).toThrow('List type requires a minimum of 3 options');
			});

			it('should accept 2 options for button type', () => {
				const options = [
					{ id: '1', title: 'Yes' },
					{ id: '2', title: 'No' },
				];

				const result = parseOptions(options, MESSAGE_TYPES.BUTTON, false);

				expect(result).toHaveLength(2);
			});
		});

		describe('Manual mode', () => {
			it('should parse manual options from fixedCollection', () => {
				const manualOptions = {
					fields: [
						{ id: '1', title: 'Option 1', description: 'First' },
						{ id: '2', title: 'Option 2', description: 'Second' },
						{ id: '3', title: 'Option 3', description: 'Third' },
					],
				};

				const result = parseOptions(manualOptions, MESSAGE_TYPES.LIST, true);

				expect(result).toHaveLength(3);
				expect(result[0]).toEqual({ id: '1', title: 'Option 1', description: 'First' });
			});

			it('should handle empty manual options', () => {
				const manualOptions = { fields: [] };

				expect(() => {
					parseOptions(manualOptions, MESSAGE_TYPES.LIST, true);
				}).toThrow('List type requires a minimum of 3 options');
			});

			it('should handle undefined options', () => {
				expect(() => {
					parseOptions(undefined, MESSAGE_TYPES.LIST, true);
				}).toThrow('List type requires a minimum of 3 options');
			});
		});
	});

	describe('buildMessageBody', () => {
		const options: EnreachOption[] = [
			{ id: '1', title: 'Option 1', description: 'First' },
			{ id: '2', title: 'Option 2', description: 'Second' },
			{ id: '3', title: 'Option 3', description: 'Third' },
		];

		it('should build message body for list type with all fields', () => {
			const result = buildMessageBody(
				MESSAGE_TYPES.LIST,
				'test-jwt-token',
				'Choose an option',
				options,
				'Select',
				'https://example.com/resume'
			);

			expect(result).toEqual({
				type: MESSAGE_TYPES.LIST,
				text: 'Choose an option',
				options: options,
				jwt: 'test-jwt-token',
				buttonTitle: 'Select',
				resumUrl: 'https://example.com/resume',
			});
		});

		it('should build message body for button type without buttonTitle', () => {
			const buttonOptions = [
				{ id: 'yes', title: 'Yes' },
				{ id: 'no', title: 'No' },
			];

			const result = buildMessageBody(
				MESSAGE_TYPES.BUTTON,
				'test-jwt-token',
				'Do you agree?',
				buttonOptions,
				undefined,
				'https://example.com/resume'
			);

			expect(result).toEqual({
				type: MESSAGE_TYPES.BUTTON,
				text: 'Do you agree?',
				options: buttonOptions,
				jwt: 'test-jwt-token',
				resumUrl: 'https://example.com/resume',
			});
			expect(result.buttonTitle).toBeUndefined();
		});

		it('should build message body without JWT when empty', () => {
			const result = buildMessageBody(
				MESSAGE_TYPES.TEXT,
				'',
				'Hello world',
				[],
				undefined,
				undefined
			);

			expect(result).toEqual({
				type: MESSAGE_TYPES.TEXT,
				text: 'Hello world',
				options: [],
			});
			expect(result.jwt).toBeUndefined();
			expect(result.resumUrl).toBeUndefined();
		});

		it('should build message body without resumUrl when not provided', () => {
			const result = buildMessageBody(
				MESSAGE_TYPES.TEXT,
				'test-jwt-token',
				'Hello world',
				[],
				undefined,
				undefined
			);

			expect(result).toEqual({
				type: MESSAGE_TYPES.TEXT,
				text: 'Hello world',
				options: [],
				jwt: 'test-jwt-token',
			});
			expect(result.resumUrl).toBeUndefined();
		});

		it('should include buttonTitle only for list type', () => {
			const result = buildMessageBody(
				MESSAGE_TYPES.BUTTON,
				'jwt',
				'Text',
				options,
				'Should be ignored',
				undefined
			);

			expect(result.buttonTitle).toBeUndefined();
		});

		it('should handle empty options array', () => {
			const result = buildMessageBody(
				MESSAGE_TYPES.TEXT,
				'jwt',
				'Text message',
				[],
				undefined,
				undefined
			);

			expect(result.options).toEqual([]);
		});
	});
});
