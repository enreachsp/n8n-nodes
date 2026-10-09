import {
	IHookFunctions,
	IWebhookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	ApplicationError,
	NodeConnectionTypes,
} from 'n8n-workflow';
import { handleWebhook } from '../utils/EnreachUtils';
import { enreachCredentialTest } from '../utils/credentialTest';

export class EnreachTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Enreach Trigger',
		name: 'enreachTrigger',
		icon: { light: 'file:enreach.svg', dark: 'file:enreach.dark.svg' },
		group: ['trigger'],
		version: 2,
		documentationUrl: 'https://developer.sp.enreach.com/guide/n8n-node-custom-enreach-/node-trigger/node-enreach-%28-trigger-%29',
		subtitle: '={{$parameter["webhookPath"]}}',
		description: 'Listen for Enreach webhook events (SMS delivery, failures, etc.)',
		defaults: {
			name: 'Enreach Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'enreachApi',
				required: false,
				testedBy: 'enreachCredentialTest',
				displayOptions: {
					show: {
						authMethod: ['jwtAuth'],
					},
				},
			},
			// n8n's built-in JWT Auth, kept for workflows created with older node versions
			{
				name: 'jwtAuth',
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
						description: 'Validate the JWT from the Authorization: Bearer header with the configured secret',
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

	methods = {
		credentialTest: { enreachCredentialTest },
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookPath = this.getNodeParameter('webhookPath') as string;
				if (!webhookPath || !webhookPath.trim()) {
					throw new ApplicationError('Webhook path cannot be empty. Please provide a unique, hard-to-guess value (e.g., UUID).');
				}
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const authMethod = this.getNodeParameter('authMethod') as string;
		return handleWebhook(this, authMethod);
	}
}
