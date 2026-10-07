import { describe, it, expect, jest } from '@jest/globals';
import {
	calculateTimeout,
	validateMessageParameters,
	parseOptions,
	buildMessageBody,
	sendEnreachMessage,
	handleWebhook,
	processSendAndWait,
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
					httpRequest: jest.fn<any>().mockResolvedValue(httpResponse),
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
		const SECRET = 'test-secret-key-123';
		const futureTime = () => Math.floor(Date.now() / 1000) + 3600;

		function createMockWebhookFunctions(
			bodyData: any = {},
			credentials: any = { jwtSecret: SECRET },
			headerData: any = {},
		): any {
			const response: any = {};
			response.status = jest.fn<any>().mockReturnValue(response);
			response.json = jest.fn<any>().mockReturnValue(response);
			return {
				response,
				getBodyData: jest.fn<any>().mockReturnValue(bodyData),
				getHeaderData: jest.fn<any>().mockReturnValue(headerData),
				getNodeParameter: jest.fn<any>().mockReturnValue('jwtAuth'),
				getCredentials: jest.fn<any>().mockResolvedValue(credentials),
				getResponseObject: jest.fn<any>().mockReturnValue(response),
			};
		}

		function bearer(token: string): Record<string, string> {
			return { authorization: `Bearer ${token}` };
		}

		function expectRejected(result: any, mockFn: any, status = 401): void {
			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockFn.response.status).toHaveBeenCalledWith(status);
			expect(mockFn.response.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
		}

		it('should return workflow data when the Authorization Bearer JWT is valid', async () => {
			const authJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET);
			const bodyData = { message: 'hello' };
			const mockFn = createMockWebhookFunctions(bodyData, { jwtSecret: SECRET }, bearer(authJwt));

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData![0][0].json).toEqual(bodyData);
			expect(mockFn.getResponseObject).not.toHaveBeenCalled();
		});

		it('should accept a Bearer JWT without exp claim', async () => {
			const authJwt = createValidJWT({ sub: 'istra', iat: 1516239022 }, SECRET);
			const mockFn = createMockWebhookFunctions({}, { jwtSecret: SECRET }, bearer(authJwt));

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
		});

		it('should accept a callback token signed with an unknown key when the Bearer is valid', async () => {
			const authJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET);
			const callbackToken = createValidJWT({ sub: 'platform' }, 'internal-platform-key');
			const mockFn = createMockWebhookFunctions(
				{ message: 'hello' },
				{ jwtSecret: SECRET },
				{ ...bearer(authJwt), 'x-callback-auth-token': callbackToken },
			);

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect((result.workflowData![0][0].json as any).jwt).toBe(callbackToken);
			expect((result.workflowData![0][0].json as any).message).toBe('hello');
		});

		it('should not expose the Bearer JWT in the workflow output', async () => {
			const authJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET);
			const mockFn = createMockWebhookFunctions({ message: 'hello' }, { jwtSecret: SECRET }, bearer(authJwt));

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData![0][0].json).not.toHaveProperty('jwt');
		});

		it('should accept the Bearer scheme case-insensitively and trim the header', async () => {
			const authJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET);
			const mockFn = createMockWebhookFunctions({}, { jwtSecret: SECRET }, { authorization: `  bearer ${authJwt}  ` });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
		});

		it('should read the Authorization header in its original case', async () => {
			const authJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET);
			const mockFn = createMockWebhookFunctions({}, { jwtSecret: SECRET }, { Authorization: `Bearer ${authJwt}` });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expect(result.workflowData).toBeDefined();
		});

		it('should reply a real HTTP 401 when the Authorization header is missing', async () => {
			const mockFn = createMockWebhookFunctions({ message: 'hello' });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expectRejected(result, mockFn);
			expect(mockFn.response.json).toHaveBeenCalledWith({
				error: 'Unauthorized',
				message: 'JWT token missing in Authorization header',
			});
		});

		it('should reject a body.jwt signed with the secret when no Bearer is sent', async () => {
			const bodyJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET);
			const mockFn = createMockWebhookFunctions({ jwt: bodyJwt });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expectRejected(result, mockFn);
		});

		it('should reject an X-Callback-Auth-Token used without Bearer', async () => {
			const callbackJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET);
			const mockFn = createMockWebhookFunctions({}, { jwtSecret: SECRET }, { 'x-callback-auth-token': callbackJwt });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expectRejected(result, mockFn);
		});

		it('should reject a Bearer JWT signed with another secret', async () => {
			const authJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, 'wrong-secret');
			const mockFn = createMockWebhookFunctions({}, { jwtSecret: SECRET }, bearer(authJwt));

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expectRejected(result, mockFn);
			expect(mockFn.response.json).toHaveBeenCalledWith({
				error: 'Unauthorized',
				message: 'Invalid or expired JWT token',
			});
		});

		it('should reject an Authorization header without the Bearer scheme', async () => {
			const authJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET);
			const mockFn = createMockWebhookFunctions({}, { jwtSecret: SECRET }, { authorization: authJwt });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expectRejected(result, mockFn);
		});

		it('should reject a non-string Authorization header (e.g. duplicated by proxy)', async () => {
			const authJwt = createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET);
			const mockFn = createMockWebhookFunctions({}, { jwtSecret: SECRET }, { authorization: [`Bearer ${authJwt}`] });

			const result = await handleWebhook(mockFn, 'jwtAuth');

			expectRejected(result, mockFn);
		});

		it('should skip auth when authMethod is none and still pass the callback token', async () => {
			const bodyData = { message: 'no auth needed' };
			const mockFn = createMockWebhookFunctions(bodyData, undefined, { 'x-callback-auth-token': 'opaque-token' });

			const result = await handleWebhook(mockFn, 'none');

			expect(result.workflowData![0][0].json).toEqual({ ...bodyData, jwt: 'opaque-token' });
		});

		it('should fail-closed when authMethod is not provided', async () => {
			const mockFn = createMockWebhookFunctions({});
			mockFn.getNodeParameter.mockImplementation(() => { throw new Error('param not found'); });

			const result = await handleWebhook(mockFn);

			// Should default to jwtAuth and reject missing JWT
			expectRejected(result, mockFn);
		});

		describe('callback token passthrough', () => {
			const authHeaders = () => bearer(createValidJWT({ sub: 'istra', exp: futureTime() }, SECRET));

			it('should prefer X-Callback-Auth-Token header over body.jwt', async () => {
				const mockFn = createMockWebhookFunctions(
					{ jwt: 'body-token' },
					{ jwtSecret: SECRET },
					{ ...authHeaders(), 'x-callback-auth-token': 'header-token' },
				);

				const result = await handleWebhook(mockFn, 'jwtAuth');

				expect((result.workflowData![0][0].json as any).jwt).toBe('header-token');
			});

			it('should read X-Callback-Auth-Token in its original case and trim it', async () => {
				const mockFn = createMockWebhookFunctions(
					{},
					{ jwtSecret: SECRET },
					{ ...authHeaders(), 'X-Callback-Auth-Token': '  header-token  ' },
				);

				const result = await handleWebhook(mockFn, 'jwtAuth');

				expect((result.workflowData![0][0].json as any).jwt).toBe('header-token');
			});

			it('should fall back to body.jwt when the header is blank or not a string', async () => {
				for (const headerValue of ['   ', ['tok1', 'tok2']]) {
					const mockFn = createMockWebhookFunctions(
						{ jwt: 'body-token' },
						{ jwtSecret: SECRET },
						{ ...authHeaders(), 'x-callback-auth-token': headerValue },
					);

					const result = await handleWebhook(mockFn, 'jwtAuth');

					expect((result.workflowData![0][0].json as any).jwt).toBe('body-token');
				}
			});
		});
	});

	describe('processSendAndWait', () => {
		it('should send the callback token even when authMethod is none', async () => {
			const params: Record<string, any> = {
				type: 'text',
				text: 'Hello',
				authMethod: 'none',
				triggerNodeName: 'Enreach Trigger',
				callbackUrl: 'https://example.com/callback',
				jwt: 'opaque-token',
				limitWaitTime: false,
			};
			const mockExec: any = {
				getNodeParameter: jest.fn<any>().mockImplementation(
					(name: string, _index: number, defaultValue?: any) => (name in params ? params[name] : defaultValue),
				),
				evaluateExpression: jest.fn<any>().mockReturnValue('https://example.com/resume'),
				putExecutionToWait: jest.fn<any>().mockResolvedValue(undefined),
				getInputData: jest.fn<any>().mockReturnValue([]),
				helpers: { httpRequest: jest.fn<any>().mockResolvedValue({ ok: true }) },
			};

			const result = await processSendAndWait(mockExec, 0);

			const request = mockExec.helpers.httpRequest.mock.calls[0][0];
			expect(request.headers).toEqual({ 'X-Callback-Auth-Token': 'opaque-token' });
			expect(request.body.jwt).toBe('opaque-token');
			expect(request.body.resumUrl).toBe('https://example.com/resume');
			expect((result.json as any).sentRequest.body).not.toHaveProperty('jwt');
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
				evaluateExpression: jest.fn<any>().mockReturnValue('https://example.com/resume'),
				helpers: {
					httpRequest: jest.fn<any>().mockResolvedValue(httpResponse),
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

		it('should send the callback token received by the trigger', async () => {
			const params: Record<string, any> = {
				type: 'text',
				text: 'Hello world',
				triggerNodeName: 'Enreach Trigger',
				callbackUrl: 'https://example.com/callback',
				jwt: 'opaque-token',
			};
			const mockExec = createMockExecuteFunctions(params, { ok: true });

			await processSendMessage(mockExec, 0);

			const request = mockExec.helpers.httpRequest.mock.calls[0][0];
			expect(request.headers).toEqual({ 'X-Callback-Auth-Token': 'opaque-token' });
			expect(request.body.jwt).toBe('opaque-token');
		});

		it('should send no callback token when the trigger received none', async () => {
			const params: Record<string, any> = {
				type: 'text',
				text: 'Hello world',
				triggerNodeName: 'Enreach Trigger',
				callbackUrl: 'https://example.com/callback',
			};
			const mockExec = createMockExecuteFunctions(params, { ok: true });

			await processSendMessage(mockExec, 0);

			const request = mockExec.helpers.httpRequest.mock.calls[0][0];
			expect(request.headers).toEqual({});
			expect(request.body).not.toHaveProperty('jwt');
		});
	});
});
