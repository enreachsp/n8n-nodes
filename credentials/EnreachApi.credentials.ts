import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class EnreachApi implements ICredentialType {
	name = 'enreachApi';
	displayName = 'JWT Auth';
	documentationUrl = 'https://docs.enreach.com';
	icon = {
		light: 'file:enreach.svg',
		dark: 'file:enreach.svg',
	} as any;
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