import { describe, it, expect } from '@jest/globals';
import type { ICredentialType } from 'n8n-workflow';
import { EnreachApi } from '../../credentials/EnreachApi.credentials';

describe('EnreachApi credentials', () => {
	const credentials: ICredentialType = new EnreachApi();

	it('tests the credential with a GET on the Enreach check endpoint', () => {
		expect(credentials.test?.request).toEqual({
			baseURL: 'https://n8n.eupcloud.io',
			url: '/webhook/testcredentials',
			method: 'GET',
		});
	});

	it('never sends the JWT secret during the test', () => {
		expect(credentials.authenticate).toBeUndefined();
		expect(JSON.stringify(credentials.test)).not.toContain('$credentials');
	});
});
