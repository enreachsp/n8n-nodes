import { describe, it, expect } from '@jest/globals';
import type { ICredentialType } from 'n8n-workflow';
import { EnreachApi } from '../../credentials/EnreachApi.credentials';

describe('EnreachApi credentials', () => {
	const credentials: ICredentialType = new EnreachApi();

	// The secret only validates incoming webhooks: it is checked locally by the
	// Enreach Trigger (testedBy), never by a request to an external endpoint
	it('declares no HTTP credential test', () => {
		expect(credentials.test).toBeUndefined();
	});

	it('never sends the JWT secret in outgoing requests', () => {
		expect(credentials.authenticate).toBeUndefined();
	});
});
