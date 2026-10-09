import { NodeOperationError, IExecuteFunctions } from 'n8n-workflow';

export enum EnreachErrorCode {
	// Configuration errors
	CONFIG_MISSING_TRIGGER = 'CONFIG_MISSING_TRIGGER',

	// Validation errors
	VALIDATION_TEXT_TOO_LONG = 'VALIDATION_TEXT_TOO_LONG',
	VALIDATION_TITLE_TOO_LONG = 'VALIDATION_TITLE_TOO_LONG',
	VALIDATION_INSUFFICIENT_OPTIONS = 'VALIDATION_INSUFFICIENT_OPTIONS',
	VALIDATION_TOO_MANY_OPTIONS = 'VALIDATION_TOO_MANY_OPTIONS',
	VALIDATION_OPTION_ID_TOO_LONG = 'VALIDATION_OPTION_ID_TOO_LONG',
	VALIDATION_OPTION_TITLE_TOO_LONG = 'VALIDATION_OPTION_TITLE_TOO_LONG',
	VALIDATION_INVALID_JSON = 'VALIDATION_INVALID_JSON',
	VALIDATION_INVALID_DATETIME = 'VALIDATION_INVALID_DATETIME',
	VALIDATION_INVALID_TIME_UNIT = 'VALIDATION_INVALID_TIME_UNIT',
}

export class EnreachNodeError extends NodeOperationError {
	readonly errorCode: EnreachErrorCode;

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
		this.errorCode = code;
	}
}

function getErrorDescription(code: EnreachErrorCode): string {
	const descriptions: Record<EnreachErrorCode, string> = {
		[EnreachErrorCode.CONFIG_MISSING_TRIGGER]: 'Cannot find the specified Enreach Trigger node. Make sure it exists and is properly connected.',

		[EnreachErrorCode.VALIDATION_TEXT_TOO_LONG]: 'The message text exceeds the maximum allowed length of 1024 characters for list/button types.',
		[EnreachErrorCode.VALIDATION_TITLE_TOO_LONG]: 'The button title exceeds the maximum allowed length of 20 characters.',
		[EnreachErrorCode.VALIDATION_INSUFFICIENT_OPTIONS]: 'List type requires a minimum of 3 options.',
		[EnreachErrorCode.VALIDATION_TOO_MANY_OPTIONS]: 'List type supports a maximum of 10 options.',
		[EnreachErrorCode.VALIDATION_OPTION_ID_TOO_LONG]: 'Option ID exceeds the maximum allowed length of 256 characters.',
		[EnreachErrorCode.VALIDATION_OPTION_TITLE_TOO_LONG]: 'Option title exceeds the maximum allowed length of 20 characters for button type.',
		[EnreachErrorCode.VALIDATION_INVALID_JSON]: 'The provided JSON is not valid. Please provide a valid JSON array.',
		[EnreachErrorCode.VALIDATION_INVALID_DATETIME]: 'The provided date/time value is not valid.',
		[EnreachErrorCode.VALIDATION_INVALID_TIME_UNIT]: 'The provided time unit is not valid. Use seconds, minutes, hours, or days.',
	};

	return descriptions[code] || 'An unknown error occurred.';
}

/**
 * User-friendly error messages for common scenarios
 */
export function createUserFriendlyError(
	executeFunctions: IExecuteFunctions,
	code: EnreachErrorCode,
	details: Record<string, string | number | boolean | undefined>,
	itemIndex?: number
): EnreachNodeError {
	const messages: Record<EnreachErrorCode, (details: Record<string, unknown>) => string> = {
		[EnreachErrorCode.VALIDATION_TEXT_TOO_LONG]: (d) =>
			`Message text is too long (${d.length} characters). Maximum allowed: ${d.max} characters.`,

		[EnreachErrorCode.VALIDATION_TITLE_TOO_LONG]: (d) =>
			`Button title "${d.title}" is too long (${d.length} characters). Maximum allowed: ${d.max} characters.`,

		[EnreachErrorCode.VALIDATION_INSUFFICIENT_OPTIONS]: (d) =>
			`List requires at least ${d.min} options, but only ${d.current} provided.`,

		[EnreachErrorCode.VALIDATION_TOO_MANY_OPTIONS]: (d) =>
			`Too many options (${d.current}). Maximum allowed: ${d.max} options.`,

		[EnreachErrorCode.CONFIG_MISSING_TRIGGER]: (d) =>
			`Cannot find trigger node "${d.nodeName}". Please check the node name and ensure it exists in your workflow.`,

		[EnreachErrorCode.VALIDATION_OPTION_ID_TOO_LONG]: (d) =>
			`Option ${d.index} ID is too long (${d.length} characters). Maximum allowed: ${d.max} characters.`,

		[EnreachErrorCode.VALIDATION_OPTION_TITLE_TOO_LONG]: (d) =>
			`Option ${d.index} title is too long (${d.length} characters). Maximum allowed: ${d.max} characters.`,

		[EnreachErrorCode.VALIDATION_INVALID_JSON]: (d) =>
			`Failed to parse options JSON: ${d.error}. Please provide a valid JSON array.`,

		[EnreachErrorCode.VALIDATION_INVALID_DATETIME]: (d) =>
			`Invalid date/time value: "${d.value}". Please provide a valid date.`,

		[EnreachErrorCode.VALIDATION_INVALID_TIME_UNIT]: (d) =>
			`Unknown time unit: "${d.unit}". Valid units: ${d.validUnits}.`,
	};

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