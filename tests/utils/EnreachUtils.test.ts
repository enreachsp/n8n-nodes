// Test doubles are partial stubs of n8n interfaces, so `any` is intentional here.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, jest } from '@jest/globals';
import {
	calculateTimeout,
	validateMessageParameters,
	parseOptions,
	buildMessageBody,
	sendEnreachMessage,
	handleWebhook,
	processSendMessage,
	EnreachOption,
	EnreachMessageBody,
} from '../../nodes/utils/EnreachUtils';
import { MESSAGE_TYPES } from '../../nodes/utils/constants';
import { createValidJWT } from '../helpers';

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
			});
			expect(result.jwt).toBeUndefined();
			expect(result.options).toBeUndefined();
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

		it('should omit options when empty', () => {
			const result = buildMessageBody(
				MESSAGE_TYPES.TEXT,
				'jwt',
				'Text message',
				[],
				undefined,
				undefined
			);

			expect(result.options).toBeUndefined();
		});
	});

	describe('sendEnreachMessage', () => {
		function createMockExecuteFunctions(httpResponse: any = {}): any {
			return {
				helpers: {
					httpRequest: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(httpResponse),
				},
			};
		}

		it('should send a POST request with the message body', async () => {
			const mockExec = createMockExecuteFunctions({ success: true });
			const messageBody: EnreachMessageBody = {
				type: 'text',
				text: 'Hello',
				options: [],
			};

			const result = await sendEnreachMessage(mockExec, 'https://example.com/callback', messageBody);

			expect(mockExec.helpers.httpRequest).toHaveBeenCalledWith({
				method: 'POST',
				url: 'https://example.com/callback',
				body: messageBody,
				headers: {},
				json: true,
				returnFullResponse: false,
			});
			expect(result).toEqual({ success: true });
		});

		it('should mirror JWT into X-Callback-Auth-Token header when present', async () => {
			const mockExec = createMockExecuteFunctions({ success: true });
			const messageBody: EnreachMessageBody = {
				type: 'text',
				text: 'Hello',
				jwt: 'some.jwt.token',
			};

			await sendEnreachMessage(mockExec, 'https://example.com/callback', messageBody);

			expect(mockExec.helpers.httpRequest).toHaveBeenCalledWith(
				expect.objectContaining({
					headers: { 'X-Callback-Auth-Token': 'some.jwt.token' },
					body: messageBody,
				}),
			);
		});

		it('should not set X-Callback-Auth-Token header when JWT is absent', async () => {
			const mockExec = createMockExecuteFunctions({ success: true });
			const messageBody: EnreachMessageBody = {
				type: 'text',
				text: 'Hello',
			};

			await sendEnreachMessage(mockExec, 'https://example.com/callback', messageBody);

			const callArgs = mockExec.helpers.httpRequest.mock.calls[0][0];
			expect(callArgs.headers).toEqual({});
		});

		it('should propagate HTTP errors', async () => {
			const mockExec = createMockExecuteFunctions();
			mockExec.helpers.httpRequest.mockRejectedValue(new Error('Network error'));

			const messageBody: EnreachMessageBody = {
				type: 'text',
				text: 'Hello',
				options: [],
			};

			await expect(
				sendEnreachMessage(mockExec, 'https://example.com/callback', messageBody)
			).rejects.toThrow('Network error');
		});
	});

	describe('handleWebhook', () => {
		const SECRET = 'dummy-secret-key-123';

		function createMockWebhookFunctions(
			bodyData: any = {},
			credentials: any = { jwtSecret: SECRET },
			headerData: any = {},
		): any {
			return {
				getBodyData: jest.fn<(...args: unknown[]) => unknown>().mockReturnValue(bodyData),
				getHeaderData: jest.fn<(...args: unknown[]) => unknown>().mockReturnValue(headerData),
				getNodeParameter: jest.fn<(...args: unknown[]) => unknown>().mockReturnValue('jwtAuth'),
				getCredentials: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(credentials),
			};
		}

		it('should return workflow data on valid JWT auth', async () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const jwt = createValidJWT({ userId: '123', exp: futureTime }, SECRET);
			const bodyData = { jwt, message: 'hello' };
			const mockFn = createMockWebhookFunctions(bodyData);

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(bodyData);
		});

		it('should return 401 when JWT is missing', async () => {
			const mockFn = createMockWebhookFunctions({});

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.webhookResponse).toBeDefined();
			const body = JSON.parse(result.webhookResponse!.body as string);
			expect(body.error).toBe('Unauthorized');
		});

		it('should skip auth when authMethod is none', async () => {
			const bodyData = { message: 'no auth needed' };
			const mockFn = createMockWebhookFunctions(bodyData);

			const result = await handleWebhook(mockFn, 'none');

			expect(result.workflowData).toBeDefined();
			expect(result.workflowData![0][0].json).toEqual(bodyData);
		});

		it('should fail-closed when authMethod is not provided', async () => {
			const mockFn = createMockWebhookFunctions({});
			mockFn.getNodeParameter.mockImplementation(() => { throw new Error('param not found'); });

			const result = await handleWebhook(mockFn);

			// Should default to jwtAuth and reject missing JWT
			expect(result.webhookResponse).toBeDefined();
		});

		it('should accept JWT from X-Callback-Auth-Token header (lowercase)', async () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const jwt = createValidJWT({ userId: '123', exp: futureTime }, SECRET);
			const bodyData = { message: 'hello' };
			const mockFn = createMockWebhookFunctions(bodyData, { jwtSecret: SECRET }, { 'x-callback-auth-token': jwt });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
			expect((result.workflowData![0][0].json as any).jwt).toBe(jwt);
			expect((result.workflowData![0][0].json as any).message).toBe('hello');
		});

		it('should accept JWT from X-Callback-Auth-Token header (original case)', async () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const jwt = createValidJWT({ userId: '123', exp: futureTime }, SECRET);
			const bodyData = { message: 'hello' };
			const mockFn = createMockWebhookFunctions(bodyData, { jwtSecret: SECRET }, { 'X-Callback-Auth-Token': jwt });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
			expect((result.workflowData![0][0].json as any).jwt).toBe(jwt);
		});

		it('should prefer header JWT over body JWT when both are present', async () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const headerJwt = createValidJWT({ source: 'header', exp: futureTime }, SECRET);
			const bodyJwt = createValidJWT({ source: 'body', exp: futureTime }, SECRET);
			const bodyData = { jwt: bodyJwt, message: 'hello' };
			const mockFn = createMockWebhookFunctions(bodyData, { jwtSecret: SECRET }, { 'x-callback-auth-token': headerJwt });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
			expect((result.workflowData![0][0].json as any).jwt).toBe(headerJwt);
		});

		it('should reject 401 when both header and body JWT are missing', async () => {
			const mockFn = createMockWebhookFunctions({ message: 'hello' }, { jwtSecret: SECRET }, {});

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.webhookResponse).toBeDefined();
			const body = JSON.parse(result.webhookResponse!.body as string);
			expect(body.error).toBe('Unauthorized');
		});

		it('should ignore whitespace-only header and fall back to body', async () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const bodyJwt = createValidJWT({ userId: '123', exp: futureTime }, SECRET);
			const bodyData = { jwt: bodyJwt, message: 'hello' };
			const mockFn = createMockWebhookFunctions(bodyData, { jwtSecret: SECRET }, { 'x-callback-auth-token': '   ' });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
			expect((result.workflowData![0][0].json as any).jwt).toBe(bodyJwt);
		});

		it('should trim surrounding whitespace from header JWT', async () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const jwt = createValidJWT({ userId: '123', exp: futureTime }, SECRET);
			const mockFn = createMockWebhookFunctions({}, { jwtSecret: SECRET }, { 'x-callback-auth-token': `  ${jwt}  ` });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
			expect((result.workflowData![0][0].json as any).jwt).toBe(jwt);
		});

		it('should fall back to body when header value is not a string (e.g. duplicated by proxy)', async () => {
			const futureTime = Math.floor(Date.now() / 1000) + 3600;
			const bodyJwt = createValidJWT({ userId: '123', exp: futureTime }, SECRET);
			const bodyData = { jwt: bodyJwt };
			const mockFn = createMockWebhookFunctions(bodyData, { jwtSecret: SECRET }, { 'x-callback-auth-token': ['tok1', 'tok2'] });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
			expect((result.workflowData![0][0].json as any).jwt).toBe(bodyJwt);
		});
	});

	describe('processSendMessage', () => {
		function createMockExecuteFunctions(params: Record<string, any>, httpResponse: any = {}): any {
			return {
				getNodeParameter: jest.fn<any>().mockImplementation(
					(name: string, _index: number, defaultValue?: any) => {
						if (name in params) return params[name];
						if (defaultValue !== undefined) return defaultValue;
						throw new Error(`Parameter "${name}" not found`);
					},
				),
				evaluateExpression: jest.fn<(...args: unknown[]) => unknown>().mockReturnValue('https://example.com/resume'),
				helpers: {
					httpRequest: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(httpResponse),
				},
			};
		}

		it('should send a text message and return simplified output', async () => {
			const params: Record<string, any> = {
				type: 'text',
				text: 'Hello world',
				authMethod: 'none',
				triggerNodeName: 'Enreach Trigger',
				callbackUrl: 'https://example.com/callback',
			};
			const mockExec = createMockExecuteFunctions(params, { ok: true });

			const result = await processSendMessage(mockExec, 0);

			expect(result.json).toHaveProperty('status', 'sent');
			expect(result.json).toHaveProperty('type', 'text');
			expect(result.json).toHaveProperty('text', 'Hello world');
			expect(mockExec.helpers.httpRequest).toHaveBeenCalledTimes(1);
		});

		it('should send a button message with manual options', async () => {
			const params: Record<string, any> = {
				type: 'button',
				text: 'Choose:',
				authMethod: 'none',
				triggerNodeName: 'Enreach Trigger',
				callbackUrl: 'https://example.com/callback',
				optionsInputMode: 'manual',
				optionsManualButton: { fields: [{ id: '1', title: 'Yes' }, { id: '2', title: 'No' }] },
			};
			const mockExec = createMockExecuteFunctions(params, { ok: true });

			const result = await processSendMessage(mockExec, 0);

			expect(result.json).toHaveProperty('status', 'sent');
			expect(result.json).toHaveProperty('type', 'button');
		});
	});
});
