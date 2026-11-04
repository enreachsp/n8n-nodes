import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	INodeCredentialTestResult,
} from 'n8n-workflow';

/**
 * The JWT secret only validates incoming Enreach webhooks, so there is no
 * remote endpoint to call. The test checks that a secret is configured.
 */
export async function enreachCredentialTest(
	this: ICredentialTestFunctions,
	credential: ICredentialsDecrypted,
): Promise<INodeCredentialTestResult> {
	const jwtSecret = (credential.data?.jwtSecret as string | undefined)?.trim();

	if (!jwtSecret) {
		return { status: 'Error', message: 'The JWT secret is empty' };
	}

	return {
		status: 'OK',
		message:
			'JWT secret is set. It is verified when Enreach calls the webhook with a signed token.',
	};
}
