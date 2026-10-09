import { describe, it, expect } from '@jest/globals';
import type {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
} from 'n8n-workflow';
import { enreachCredentialTest } from '../../nodes/utils/credentialTest';

const context = {} as ICredentialTestFunctions;

function credential(data: ICredentialDataDecryptedObject): ICredentialsDecrypted {
	return { id: '1', name: 'Enreach', type: 'enreachApi', data };
}

describe('enreachCredentialTest', () => {
	it('returns OK when a JWT secret is set', async () => {
		const result = await enreachCredentialTest.call(context, credential({ jwtSecret: 'a-secret' }));
		expect(result.status).toBe('OK');
	});

	const emptySecrets: ICredentialDataDecryptedObject[] = [{}, { jwtSecret: '' }, { jwtSecret: '   ' }];

	it.each(emptySecrets)('returns Error for %j', async (data) => {
		const result = await enreachCredentialTest.call(context, credential(data));
		expect(result.status).toBe('Error');
		expect(result.message).toMatch(/empty/);
	});
});
