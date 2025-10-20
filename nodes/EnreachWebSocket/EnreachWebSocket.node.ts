import {
	ITriggerFunctions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	IDataObject,
} from 'n8n-workflow';
import { Server as WebSocketServer } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { validateWebhookAuth } from '../utils/webhookAuth';

export class EnreachWebSocket implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Enreach WebSocket',
		name: 'enreachWebSocket',
		icon: 'file:enreach.svg',
		group: ['trigger'],
		version: 1,
		subtitle: 'Port: {{$parameter["port"]}}',
		description: 'WebSocket server that listens for incoming Enreach messages',
		defaults: {
			name: 'Enreach WebSocket',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'enreachApi',
				required: false,
				displayOptions: {
					show: {
						authMethod: ['jwtAuth'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Port',
				name: 'port',
				type: 'number',
				default: 8080,
				placeholder: '8080',
				description: 'The port on which the WebSocket server will listen',
				required: true,
				typeOptions: {
					minValue: 1024,
					maxValue: 65535,
				},
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '/ws',
				placeholder: '/ws',
				description: 'The path on which the WebSocket server will accept connections',
			},
			{
				displayName: 'Authentication',
				name: 'authMethod',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'Accept all messages without authentication',
					},
					{
						name: 'JWT Auth',
						value: 'jwtAuth',
						description: 'Validate JWT token with configured secret',
					},
				],
				default: 'jwtAuth',
				description: 'Choose how to authenticate incoming WebSocket messages',
				required: true,
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const port = this.getNodeParameter('port') as number;
		const path = this.getNodeParameter('path', '/ws') as string;
		const authMethod = this.getNodeParameter('authMethod') as string;

		// Create HTTP server
		const httpServer = createServer();

		// Create WebSocket server
		const wss = new WebSocketServer({
			server: httpServer,
			path: path
		});

		console.log(`[EnreachWebSocket] Starting WebSocket server on port ${port}, path ${path}`);

		// Handle new WebSocket connections
		wss.on('connection', (ws, request: IncomingMessage) => {
			const clientIp = request.socket.remoteAddress;
			console.log(`[EnreachWebSocket] New client connected from ${clientIp}`);

			// Send welcome message
			ws.send(JSON.stringify({
				type: 'connected',
				message: 'Connected to Enreach WebSocket Server',
				timestamp: new Date().toISOString(),
			}));

			// Handle messages from this client
			ws.on('message', async (data) => {
				try {
					// Parse incoming message
					const messageStr = data.toString();
					let messageData: IDataObject;

					try {
						messageData = JSON.parse(messageStr);
					} catch (parseError) {
						// If not JSON, treat as plain text
						messageData = { message: messageStr };
					}

					// Add connection metadata
					messageData._meta = {
						clientIp,
						timestamp: new Date().toISOString(),
						path: request.url,
					};

					// Validate authentication if enabled
					if (authMethod === 'jwtAuth') {
						const jwt = messageData.jwt as string | undefined;

						// Create a mock webhook functions context for validation
						const mockWebhookFunctions = {
							getCredentials: this.getCredentials.bind(this),
						} as any;

						const authResult = await validateWebhookAuth(
							mockWebhookFunctions,
							jwt,
							authMethod
						);

						if (!authResult.isValid) {
							console.error('[EnreachWebSocket] Authentication failed:', authResult.error?.message);

							// Send error response to client
							ws.send(JSON.stringify({
								type: 'error',
								error: authResult.error?.error,
								message: authResult.error?.message,
								timestamp: new Date().toISOString(),
							}));

							return; // Skip this message
						}
					}

					console.log(`[EnreachWebSocket] Message received from ${clientIp}:`, messageData);

					// Emit the message to trigger the workflow
					this.emit([
						[
							{
								json: messageData,
							},
						],
					]);

					// Send acknowledgment to client
					ws.send(JSON.stringify({
						type: 'ack',
						message: 'Message received and processed',
						timestamp: new Date().toISOString(),
					}));

				} catch (error) {
					console.error('[EnreachWebSocket] Error processing message:', error);

					// Send error to client
					ws.send(JSON.stringify({
						type: 'error',
						message: 'Error processing message',
						error: (error as Error).message,
						timestamp: new Date().toISOString(),
					}));
				}
			});

			// Handle client errors
			ws.on('error', (error: Error) => {
				console.error(`[EnreachWebSocket] Client error (${clientIp}):`, error.message);
			});

			// Handle client disconnection
			ws.on('close', (code: number, reason: Buffer) => {
				console.log(`[EnreachWebSocket] Client disconnected (${clientIp}), code: ${code}, reason: ${reason.toString()}`);
			});
		});

		// Handle WebSocket server errors
		wss.on('error', (error: Error) => {
			console.error('[EnreachWebSocket] WebSocket server error:', error.message);
		});

		// Start HTTP server
		await new Promise<void>((resolve, reject) => {
			httpServer.listen(port, () => {
				console.log(`[EnreachWebSocket] Server listening on ws://localhost:${port}${path}`);
				resolve();
			});

			httpServer.on('error', (error: Error) => {
				console.error('[EnreachWebSocket] HTTP server error:', error.message);
				reject(error);
			});
		});

		// Cleanup function - called when the workflow is deactivated or deleted
		async function closeFunction() {
			console.log('[EnreachWebSocket] Closing WebSocket server...');

			// Close all client connections
			wss.clients.forEach(client => {
				client.close(1000, 'Server shutting down');
			});

			// Close WebSocket server
			await new Promise<void>((resolve) => {
				wss.close(() => {
					console.log('[EnreachWebSocket] WebSocket server closed');
					resolve();
				});
			});

			// Close HTTP server
			await new Promise<void>((resolve) => {
				httpServer.close(() => {
					console.log('[EnreachWebSocket] HTTP server closed');
					resolve();
				});
			});

			console.log('[EnreachWebSocket] Cleanup completed');
		}

		// Return the close function for n8n to call on deactivation
		return {
			closeFunction,
		};
	}
}
