import {
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EnreachApi implements ICredentialType {
	name = 'enreachApi';
	displayName = 'Enreach API';
	documentationUrl = 'https://developer.sp.enreach.com/guide/n8n-node-custom-enreach-/credentials/credentials';
	icon = 'file:enreach.svg' as const;
	properties: INodeProperties[] = [
		{
			displayName: 'JWT Secret',
			name: 'jwtSecret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			description: 'The secret key used to validate JWT signatures (HMAC SHA-256)',
			placeholder: 'your-jwt-secret-key',
		},
	];

	// The JWT secret only validates incoming Enreach webhooks, and no Enreach API
	// can check it. The test only confirms the Enreach endpoint is reachable. It
	// sends no credential data, so the secret never leaves the n8n instance.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://n8n.eupcloud.io',
			url: '/webhook/testcredentials',
			method: 'GET',
		},
	};
}