import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';
import { validateWebhookAuth } from '../utils/webhookAuth';

export class EnreachTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Enreach Trigger',
		name: 'enreachTrigger',
		icon: 'file:enreach.svg',
		group: ['trigger'],
		version: 2,
		documentationUrl: 'https://developer-staging.sp.enreach.com/guide/n8n-node-custom-enreach-/node-trigger/node-enreach-%28-trigger-%29',
		subtitle: '={{$parameter["webhookPath"]}}',
		description: 'Listen for Enreach webhook events (SMS delivery, failures, etc.)',
		defaults: {
			name: 'Enreach Trigger',
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
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: '={{$parameter["webhookPath"]}}',
				isFullPath: true,
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authMethod',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'Accept all webhook requests without authentication',
					},
					{
						name: 'JWT Auth',
						value: 'jwtAuth',
						description: 'Validate JWT token with configured secret',
					},
				],
				default: 'jwtAuth',
				description: 'Choose how to authenticate incoming webhook requests',
				required: true,
			},
			{
				displayName: 'Webhook Path',
				name: 'webhookPath',
				type: 'string',
				default: '',
				placeholder: 'e.g., my-webhook-path or a-unique-uuid',
				description: 'The custom path for the webhook URL. Use a unique, hard-to-guess value for security (e.g., UUID).',
				required: true,
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				
				if (webhookData.webhookId === undefined) {
					return false;
				}

				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				const response = {
					id: `webhook_${Date.now()}`,
					url: webhookUrl,
				};

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = response.id;
				webhookData.webhookUrl = webhookUrl;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId) {
					delete webhookData.webhookId;
					delete webhookData.webhookUrl;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// Get webhook body
		const bodyData = this.getBodyData();
		const authMethod = this.getNodeParameter('authMethod') as string;

		// Validate authentication based on selected method
		const jwt = bodyData.jwt as string;
		const authResult = await validateWebhookAuth(this, jwt, authMethod);

		if (!authResult.isValid) {
			return {
				webhookResponse: {
					status: authResult.error!.status,
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						error: authResult.error!.error,
						message: authResult.error!.message
					}),
				},
			};
		}

		return {
			workflowData: [[
				{
					json: {
						...bodyData,
						authMethod: authMethod,
					},
				},
			]],
		};
	}
}
