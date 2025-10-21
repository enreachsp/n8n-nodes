import { NodeOperationError } from 'n8n-workflow';
import { IExecuteFunctions } from 'n8n-workflow';

export enum EnreachErrorCode {
	// Configuration errors
	CONFIG_MISSING_TRIGGER = 'CONFIG_MISSING_TRIGGER',

	// Validation errors
	VALIDATION_TEXT_TOO_LONG = 'VALIDATION_TEXT_TOO_LONG',
	VALIDATION_TITLE_TOO_LONG = 'VALIDATION_TITLE_TOO_LONG',
	VALIDATION_INSUFFICIENT_OPTIONS = 'VALIDATION_INSUFFICIENT_OPTIONS',
	VALIDATION_TOO_MANY_OPTIONS = 'VALIDATION_TOO_MANY_OPTIONS',
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
		[EnreachErrorCode.CONFIG_MISSING_TRIGGER]: 'Cannot find the specified Enreach Trigger node. Make sure it exists and is properly connected.',

		[EnreachErrorCode.VALIDATION_TEXT_TOO_LONG]: 'The message text exceeds the maximum allowed length of 1024 characters for list/button types.',
		[EnreachErrorCode.VALIDATION_TITLE_TOO_LONG]: 'The button title exceeds the maximum allowed length of 20 characters.',
		[EnreachErrorCode.VALIDATION_INSUFFICIENT_OPTIONS]: 'List type requires a minimum of 3 options.',
		[EnreachErrorCode.VALIDATION_TOO_MANY_OPTIONS]: 'List type supports a maximum of 10 options.',
	};

	return descriptions[code] || 'An unknown error occurred.';
}

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