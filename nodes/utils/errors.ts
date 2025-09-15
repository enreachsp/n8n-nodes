import { NodeOperationError } from 'n8n-workflow';
import { IExecuteFunctions } from 'n8n-workflow';

export enum EnreachErrorCode {
	// Authentication errors
	AUTH_MISSING_CREDENTIALS = 'AUTH_MISSING_CREDENTIALS',
	AUTH_INVALID_JWT = 'AUTH_INVALID_JWT',
	AUTH_EXPIRED_JWT = 'AUTH_EXPIRED_JWT',

	// Configuration errors
	CONFIG_MISSING_TRIGGER = 'CONFIG_MISSING_TRIGGER',
	CONFIG_INVALID_PARAMS = 'CONFIG_INVALID_PARAMS',

	// Validation errors
	VALIDATION_TEXT_TOO_LONG = 'VALIDATION_TEXT_TOO_LONG',
	VALIDATION_TITLE_TOO_LONG = 'VALIDATION_TITLE_TOO_LONG',
	VALIDATION_ID_TOO_LONG = 'VALIDATION_ID_TOO_LONG',
	VALIDATION_INSUFFICIENT_OPTIONS = 'VALIDATION_INSUFFICIENT_OPTIONS',
	VALIDATION_TOO_MANY_OPTIONS = 'VALIDATION_TOO_MANY_OPTIONS',

	// API errors
	API_REQUEST_FAILED = 'API_REQUEST_FAILED',
	API_TIMEOUT = 'API_TIMEOUT',
	API_RATE_LIMIT = 'API_RATE_LIMIT',

	// Webhook errors
	WEBHOOK_INVALID_RESPONSE = 'WEBHOOK_INVALID_RESPONSE',
	WEBHOOK_TIMEOUT = 'WEBHOOK_TIMEOUT',
}

export class EnreachNodeError extends NodeOperationError {
	constructor(
		node: IExecuteFunctions,
		message: string,
		code: EnreachErrorCode,
		description?: string,
		itemIndex?: number
	) {
		super(node.getNode(), message, {
			message,
			description: description || getErrorDescription(code),
			itemIndex,
		});

		this.name = 'EnreachNodeError';
		// Store error code for programmatic handling
		(this as any).errorCode = code;
	}
}

function getErrorDescription(code: EnreachErrorCode): string {
	const descriptions: Record<EnreachErrorCode, string> = {
		[EnreachErrorCode.AUTH_MISSING_CREDENTIALS]: 'Please configure Enreach API credentials in the node settings.',
		[EnreachErrorCode.AUTH_INVALID_JWT]: 'The JWT token signature is invalid. Please check your secret key.',
		[EnreachErrorCode.AUTH_EXPIRED_JWT]: 'The JWT token has expired. Please generate a new token.',

		[EnreachErrorCode.CONFIG_MISSING_TRIGGER]: 'Cannot find the specified Enreach Trigger node. Make sure it exists and is properly connected.',
		[EnreachErrorCode.CONFIG_INVALID_PARAMS]: 'Invalid node parameters. Please check your configuration.',

		[EnreachErrorCode.VALIDATION_TEXT_TOO_LONG]: 'The message text exceeds the maximum allowed length of 1024 characters for list/button types.',
		[EnreachErrorCode.VALIDATION_TITLE_TOO_LONG]: 'The button title exceeds the maximum allowed length of 20 characters.',
		[EnreachErrorCode.VALIDATION_ID_TOO_LONG]: 'The option ID exceeds the maximum allowed length of 256 characters.',
		[EnreachErrorCode.VALIDATION_INSUFFICIENT_OPTIONS]: 'List type requires a minimum of 3 options.',
		[EnreachErrorCode.VALIDATION_TOO_MANY_OPTIONS]: 'List type supports a maximum of 10 options.',

		[EnreachErrorCode.API_REQUEST_FAILED]: 'Failed to send message to Enreach API. Please check your network connection and API endpoint.',
		[EnreachErrorCode.API_TIMEOUT]: 'Request to Enreach API timed out. Please try again later.',
		[EnreachErrorCode.API_RATE_LIMIT]: 'Enreach API rate limit exceeded. Please wait before sending more requests.',

		[EnreachErrorCode.WEBHOOK_INVALID_RESPONSE]: 'Received invalid response from webhook. Expected JSON format.',
		[EnreachErrorCode.WEBHOOK_TIMEOUT]: 'Webhook response timeout. No response received within the configured time limit.',
	};

	return descriptions[code] || 'An unknown error occurred.';
}

// Removed handleApiError - not needed without retry logic
// n8n handles API errors automatically

/**
 * User-friendly error messages for common scenarios
 */
export function createUserFriendlyError(
	executeFunctions: IExecuteFunctions,
	code: EnreachErrorCode,
	details: { [key: string]: any },
	itemIndex?: number
): EnreachNodeError {
	const messages: Record<EnreachErrorCode, (details: any) => string> = {
		[EnreachErrorCode.VALIDATION_TEXT_TOO_LONG]: (d: any) =>
			`Message text is too long (${d.length} characters). Maximum allowed: ${d.max} characters.`,

		[EnreachErrorCode.VALIDATION_TITLE_TOO_LONG]: (d: any) =>
			`Button title "${d.title}" is too long (${d.length} characters). Maximum allowed: ${d.max} characters.`,

		[EnreachErrorCode.VALIDATION_INSUFFICIENT_OPTIONS]: (d: any) =>
			`List requires at least ${d.min} options, but only ${d.current} provided.`,

		[EnreachErrorCode.VALIDATION_TOO_MANY_OPTIONS]: (d: any) =>
			`Too many options (${d.current}). Maximum allowed: ${d.max} options.`,

		[EnreachErrorCode.CONFIG_MISSING_TRIGGER]: (d: any) =>
			`Cannot find trigger node "${d.nodeName}". Please check the node name and ensure it exists in your workflow.`,

		// Add more user-friendly messages as needed
	} as any;

	const messageGenerator = messages[code];
	const message = messageGenerator ? messageGenerator(details) : 'Operation failed';

	return new EnreachNodeError(
		executeFunctions,
		message,
		code,
		undefined,
		itemIndex
	);
}