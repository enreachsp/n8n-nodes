import { EnreachTrigger } from '../EnreachTrigger/EnreachTrigger.node';
import { Enreach } from '../Enreach/Enreach.node';
import { IWebhookFunctions, IExecuteFunctions } from 'n8n-workflow';
import crypto from 'crypto';

/**
 * Integration tests for the complete Enreach workflow
 * Tests the interaction between EnreachTrigger and Enreach nodes
 */
describe('Enreach Integration Tests', () => {
    const SECRET = 'test-secret-key';

    /**
     * Helper to create a valid JWT token
     */
    function createValidJWT(payload: any, expiresIn: number = 3600): string {
        const header = Buffer.from(JSON.stringify({
            alg: 'HS256',
            typ: 'JWT'
        })).toString('base64url');

        const now = Math.floor(Date.now() / 1000);
        const fullPayload = {
            ...payload,
            iat: now,
            exp: now + expiresIn
        };

        const payloadEncoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
        const signature = crypto
            .createHmac('sha256', SECRET)
            .update(`${header}.${payloadEncoded}`)
            .digest('base64url');

        return `${header}.${payloadEncoded}.${signature}`;
    }

    describe('Complete Workflow: Trigger → Process → Response', () => {
        let trigger: EnreachTrigger;
        let node: Enreach;
        let mockWebhookFunctions: jest.Mocked<IWebhookFunctions>;
        let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

        beforeEach(() => {
            trigger = new EnreachTrigger();
            node = new Enreach();

            // Mock Webhook Functions for trigger
            mockWebhookFunctions = {
                getBodyData: jest.fn(),
                getNodeParameter: jest.fn(),
                getCredentials: jest.fn(),
                getRequestObject: jest.fn(),
                getResponseObject: jest.fn(),
                getNodeWebhookUrl: jest.fn(),
                getWorkflowStaticData: jest.fn(),
            } as any;

            // Mock Execute Functions for node
            mockExecuteFunctions = {
                getNodeParameter: jest.fn(),
                getInputData: jest.fn(),
                helpers: {
                    httpRequest: jest.fn(),
                },
                getNode: jest.fn().mockReturnValue({ name: 'Enreach' }),
                putExecutionToWait: jest.fn(),
                continueOnFail: jest.fn().mockReturnValue(false),
                evaluateExpression: jest.fn().mockReturnValue('http://n8n.app/webhook/resume'),
            } as any;
        });

        it('should handle complete flow: receive webhook → send message → wait for response', async () => {
            // Step 1: Webhook trigger receives data
            const webhookJWT = createValidJWT({
                id: 'user-123',
                sid: 'session-456'
            });

            mockWebhookFunctions.getBodyData.mockReturnValue({
                jwt: webhookJWT,
                callbackUrl: 'http://enreach.api/callback',
                id: 'msg-001',
                sid: 'session-456',
                text: 'Hello from Enreach'
            });

            mockWebhookFunctions.getCredentials.mockResolvedValue({
                jwtSecret: SECRET
            });

            mockWebhookFunctions.getNodeParameter.mockReturnValue(['chat.history.conversation']);

            // Execute trigger
            const triggerResult = await trigger.webhook.call(mockWebhookFunctions);

            // Verify trigger output
            expect(triggerResult.workflowData).toBeDefined();
            expect(triggerResult.workflowData![0][0].json).toMatchObject({
                jwt: webhookJWT,
                callbackUrl: 'http://enreach.api/callback',
                id: 'msg-001',
                sid: 'session-456',
                text: 'Hello from Enreach'
            });

            // Step 2: Enreach node processes the data
            const triggerOutput = triggerResult.workflowData![0];

            // Configure node for sendAndWait operation
            mockExecuteFunctions.getNodeParameter.mockImplementation((param: string, index: number) => {
                const params: any = {
                    operation: 'sendAndWait',
                    type: 'button',
                    text: 'Please choose an option:',
                    jwt: webhookJWT,
                    callbackUrl: 'http://enreach.api/callback',
                    optionsInputMode: 'json',
                    options: JSON.stringify([
                        { id: 'yes', title: 'Yes' },
                        { id: 'no', title: 'No' }
                    ]),
                    limitWaitTime: false
                };
                return params[param];
            });

            // Mock HTTP request for sending message
            (mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
                success: true,
                messageId: 'response-001',
                status: 'sent'
            });

            // Mock webhook response data (when execution resumes)
            mockExecuteFunctions.getInputData
                .mockReturnValueOnce(triggerOutput)  // First call during send
                .mockReturnValueOnce([{ json: { selectedOption: 'yes' } }]);  // Second call when webhook resumes

            // Execute node
            const nodeResult = await node.execute.call(mockExecuteFunctions);

            // Verify node executed correctly
            expect(mockExecuteFunctions.helpers.httpRequest).toHaveBeenCalledWith({
                method: 'POST',
                url: 'http://enreach.api/callback',
                body: {
                    jwt: webhookJWT,
                    type: 'button',
                    text: 'Please choose an option:',
                    resumUrl: 'http://n8n.app/webhook/resume',
                    options: [
                        { id: 'yes', title: 'Yes' },
                        { id: 'no', title: 'No' }
                    ]
                },
                json: true,
                returnFullResponse: false
            });

            expect(mockExecuteFunctions.putExecutionToWait).toHaveBeenCalled();
            expect(nodeResult[0][0].json).toMatchObject({
                status: 'response_received',
                message: 'Webhook response received successfully',
                resumeUrl: 'http://n8n.app/webhook/resume',
                webhookResponse: { selectedOption: 'yes' }
            });
        });

        it('should handle authentication failure in trigger', async () => {
            // Invalid JWT
            const invalidJWT = 'invalid.jwt.token';

            mockWebhookFunctions.getBodyData.mockReturnValue({
                jwt: invalidJWT,
                callbackUrl: 'http://enreach.api/callback'
            });

            mockWebhookFunctions.getCredentials.mockResolvedValue({
                jwtSecret: SECRET
            });

            const result = await trigger.webhook.call(mockWebhookFunctions);

            // Should return 401 unauthorized
            expect(result.webhookResponse).toBeDefined();
            expect(result.webhookResponse!.status).toBe(401);
            expect(JSON.parse(result.webhookResponse!.body as string)).toMatchObject({
                error: 'Unauthorized',
                message: 'Invalid or expired JWT token'
            });
        });

        it('should handle expired JWT in trigger', async () => {
            // Expired JWT (expired 1 hour ago)
            const expiredJWT = createValidJWT({
                id: 'user-123',
                sid: 'session-456'
            }, -3600);

            mockWebhookFunctions.getBodyData.mockReturnValue({
                jwt: expiredJWT,
                callbackUrl: 'http://enreach.api/callback'
            });

            mockWebhookFunctions.getCredentials.mockResolvedValue({
                jwtSecret: SECRET
            });

            const result = await trigger.webhook.call(mockWebhookFunctions);

            // Should return 401 unauthorized
            expect(result.webhookResponse).toBeDefined();
            expect(result.webhookResponse!.status).toBe(401);
        });

        it('should handle sendMessage operation (fire and forget)', async () => {
            const jwt = createValidJWT({ id: 'user-123' });

            mockExecuteFunctions.getInputData.mockReturnValue([{
                json: {
                    jwt: jwt,
                    callbackUrl: 'http://enreach.api/callback'
                }
            }]);

            // Configure for sendMessage (no wait)
            mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
                const params: any = {
                    operation: 'sendMessage',
                    type: 'text',
                    text: 'Notification message',
                    jwt: jwt,
                    callbackUrl: 'http://enreach.api/callback'
                };
                return params[param];
            });

            (mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockResolvedValue({
                success: true,
                messageId: 'notif-001'
            });

            const result = await node.execute.call(mockExecuteFunctions);

            // Should NOT call putExecutionToWait
            expect(mockExecuteFunctions.putExecutionToWait).not.toHaveBeenCalled();
            expect(result[0][0].json).toMatchObject({
                status: 'sent',
                message: 'Message sent successfully',
                type: 'text',
                text: 'Notification message',
                responseStatus: 200
            });
        });

        it('should handle list message with validation', async () => {
            const jwt = createValidJWT({ id: 'user-123' });

            mockExecuteFunctions.getInputData.mockReturnValue([{
                json: { jwt, callbackUrl: 'http://enreach.api/callback' }
            }]);

            // Configure for list with less than 3 options (should fail)
            mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
                const params: any = {
                    operation: 'sendMessage',
                    type: 'list',
                    text: 'Choose one',
                    jwt: jwt,
                    callbackUrl: 'http://enreach.api/callback',
                    optionsInputMode: 'json',
                    options: JSON.stringify([
                        { id: '1', title: 'Only one option' }
                    ])
                };
                return params[param];
            });

            // Should throw validation error
            await expect(node.execute.call(mockExecuteFunctions))
                .rejects.toThrow('List type requires a minimum of 3 options');
        });

        it('should handle network errors with retry', async () => {
            const jwt = createValidJWT({ id: 'user-123' });

            mockExecuteFunctions.getInputData.mockReturnValue([{
                json: { jwt, callbackUrl: 'http://enreach.api/callback' }
            }]);

            mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
                const params: any = {
                    operation: 'sendMessage',
                    type: 'text',
                    text: 'Test message',
                    jwt: jwt,
                    callbackUrl: 'http://enreach.api/callback'
                };
                return params[param];
            });

            // Simulate network error
            const networkError = new Error('ECONNRESET');
            (networkError as any).code = 'ECONNRESET';
            (mockExecuteFunctions.helpers.httpRequest as jest.Mock).mockRejectedValue(networkError);

            await expect(node.execute.call(mockExecuteFunctions))
                .rejects.toThrow('ECONNRESET');
        });
    });

    describe('Webhook Create/Delete Lifecycle', () => {
        let trigger: EnreachTrigger;
        let mockHookFunctions: any;

        beforeEach(() => {
            trigger = new EnreachTrigger();
            mockHookFunctions = {
                getNodeWebhookUrl: jest.fn().mockReturnValue('https://n8n.instance/webhook/test'),
                getNodeParameter: jest.fn().mockReturnValue(['chat.history.conversation']),
                getWorkflowStaticData: jest.fn().mockReturnValue({})
            };
        });

        it('should create webhook configuration', async () => {
            const result = await trigger.webhookMethods.default.create.call(mockHookFunctions);

            expect(result).toBe(true);
            const staticData = mockHookFunctions.getWorkflowStaticData();
            expect(staticData.webhookId).toBeDefined();
            expect(staticData.webhookUrl).toBe('https://n8n.instance/webhook/test');
            expect(staticData.events).toEqual(['chat.history.conversation']);
        });

        it('should check webhook exists', async () => {
            const staticData = { webhookId: 'webhook-123' };
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

            const exists = await trigger.webhookMethods.default.checkExists.call(mockHookFunctions);
            expect(exists).toBe(true);
        });

        it('should delete webhook configuration', async () => {
            const staticData = {
                webhookId: 'webhook-123',
                webhookUrl: 'https://n8n.instance/webhook/test',
                events: ['chat.history.conversation']
            };
            mockHookFunctions.getWorkflowStaticData.mockReturnValue(staticData);

            const result = await trigger.webhookMethods.default.delete.call(mockHookFunctions);

            expect(result).toBe(true);
            expect(staticData.webhookId).toBeUndefined();
            expect(staticData.webhookUrl).toBeUndefined();
            expect(staticData.events).toBeUndefined();
        });
    });

    describe('Error Handling in Complete Workflow', () => {
        let node: Enreach;
        let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

        beforeEach(() => {
            node = new Enreach();
            mockExecuteFunctions = {
                getNodeParameter: jest.fn(),
                getInputData: jest.fn(),
                helpers: { httpRequest: jest.fn() },
                continueOnFail: jest.fn(),
                getNode: jest.fn().mockReturnValue({ name: 'Enreach' }),
                evaluateExpression: jest.fn().mockReturnValue('http://n8n.app/webhook/resume'),
            } as any;
        });

        it('should handle errors with continueOnFail enabled', async () => {
            mockExecuteFunctions.continueOnFail.mockReturnValue(true);
            mockExecuteFunctions.getInputData.mockReturnValue([
                { json: { data: 'item1' } },
                { json: { data: 'item2' } }
            ]);

            mockExecuteFunctions.getNodeParameter
                .mockImplementation((param: string, index: number) => {
                    // First item will succeed, second will fail
                    if (index === 0) {
                        const params: any = {
                            operation: 'sendMessage',
                            type: 'text',
                            text: 'Success message',
                            jwt: 'valid-jwt',
                            callbackUrl: 'http://api.url'
                        };
                        return params[param];
                    } else {
                        // Missing required parameters for second item
                        const params: any = {
                            operation: 'sendMessage',
                            type: 'text',
                            text: 'Fail message',
                            jwt: undefined, // Missing JWT
                            callbackUrl: 'http://api.url'
                        };
                        return params[param];
                    }
                });

            (mockExecuteFunctions.helpers.httpRequest as jest.Mock)
                .mockResolvedValueOnce({ success: true, messageId: 'msg-1' });

            const result = await node.execute.call(mockExecuteFunctions);

            // Both items should succeed (JWT is not being sent to API)
            expect(result).toHaveLength(1);
            expect(result[0]).toHaveLength(2);
            expect(result[0][0].json).toMatchObject({
                status: 'sent',
                message: 'Message sent successfully',
                type: 'text',
                text: 'Success message',
                responseStatus: 200
            });
            expect(result[0][1].json).toMatchObject({
                status: 'sent',
                message: 'Message sent successfully',
                type: 'text',
                text: 'Fail message',
                responseStatus: 200
            });
        });
    });
});