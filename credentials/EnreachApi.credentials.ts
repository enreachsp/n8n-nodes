import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EnreachApi implements ICredentialType {
	name = 'enreachApi';
	displayName = 'JWT Auth';
	documentationUrl = 'https://developer-staging.sp.enreach.com/guide/n8n-node-custom-enreach-/credentials/credentials';
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
}