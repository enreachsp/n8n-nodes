import {
    IExecuteFunctions,
    INodeExecutionData,
    IWebhookFunctions,
    IWebhookResponseData,
    IDataObject,
} from 'n8n-workflow';
import { validateWebhookAuth } from './webhookAuth';
import { ENREACH_LIMITS, TIMEOUT_CONFIG, TIME_UNITS, MESSAGE_TYPES } from './constants';
import { EnreachErrorCode, createUserFriendlyError } from './errors';

export interface EnreachOption {
    id: string;
    title: string;
    description?: string;
}

export interface ManualOptions {
    fields: EnreachOption[];
}

export interface EnreachMessageBody {
    type: string;
    jwt?: string;
    resumUrl?: string;
    text: string;
    options?: EnreachOption[];
    buttonTitle?: string;
}

export interface EnreachSentData extends IDataObject {
    sentRequest: {
        resource: string;
        operation: string;
        type: string;
        callbackUrl: string;
        body: EnreachMessageBody;
    };
    sendResponse: IDataObject;
    status: string;
    message: string;
    resumUrl?: string;
    webhookResponse?: IDataObject;
}

/**
 * Calculate timeout date based on limit configuration
 */
export function calculateTimeout(
    limitWaitTime: boolean,
    limitType: string,
    dateTime: string,
    amount: number,
    unit: string
): Date | undefined {
    if (!limitWaitTime) {
        return undefined;
    }

    if (limitType === 'dateTime') {
        const date = new Date(dateTime);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date/time value: "${dateTime}". Please provide a valid date.`);
        }
        return date;
    }

    // timeInterval - Calculate using milliseconds for accuracy
    const now = Date.now();
    let additionalMs = 0;

    const unitMultiplier = TIME_UNITS[unit as keyof typeof TIME_UNITS];
    if (!unitMultiplier) {
        throw new Error(`Unknown time unit: "${unit}". Valid units: ${Object.keys(TIME_UNITS).join(', ')}`);
    }
    additionalMs = amount * unitMultiplier;

    return new Date(now + additionalMs);
}

/**
 * Validate message parameters for character limits and option limits
 */
export function validateMessageParameters(
    type: string,
    text: string,
    buttonTitle: string | undefined,
    parsedOptions: EnreachOption[],
    executeFunctions?: IExecuteFunctions,
    itemIndex?: number
): void {
    // Validate text length for list and button types
    if ((type === MESSAGE_TYPES.LIST || type === MESSAGE_TYPES.BUTTON) && text && text.length > ENREACH_LIMITS.TEXT_MAX_LENGTH) {
        if (executeFunctions) {
            throw createUserFriendlyError(
                executeFunctions,
                EnreachErrorCode.VALIDATION_TEXT_TOO_LONG,
                { length: text.length, max: ENREACH_LIMITS.TEXT_MAX_LENGTH },
                itemIndex
            );
        } else {
            throw new Error(`Text message is too long. Maximum ${ENREACH_LIMITS.TEXT_MAX_LENGTH} characters allowed for ${type} type. Current: ${text.length} characters`);
        }
    }

    // Validate buttonTitle length - only for list type
    if (buttonTitle && buttonTitle.length > ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH) {
        if (executeFunctions) {
            throw createUserFriendlyError(
                executeFunctions,
                EnreachErrorCode.VALIDATION_TITLE_TOO_LONG,
                { title: buttonTitle, length: buttonTitle.length, max: ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH },
                itemIndex
            );
        } else {
            throw new Error(`Button title is too long. Maximum ${ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH} characters allowed. Current: ${buttonTitle.length} characters`);
        }
    }

    // Validate maximum options limit for list
    if (type === MESSAGE_TYPES.LIST && parsedOptions && parsedOptions.length > ENREACH_LIMITS.LIST_MAX_OPTIONS) {
        if (executeFunctions) {
            throw createUserFriendlyError(
                executeFunctions,
                EnreachErrorCode.VALIDATION_TOO_MANY_OPTIONS,
                { current: parsedOptions.length, max: ENREACH_LIMITS.LIST_MAX_OPTIONS },
                itemIndex
            );
        } else {
            throw new Error(`Too many options provided. Maximum ${ENREACH_LIMITS.LIST_MAX_OPTIONS} options allowed for list type. Current: ${parsedOptions.length} options`);
        }
    }

    // Validate options structure and limits for both list and button types
    if ((type === MESSAGE_TYPES.BUTTON || type === MESSAGE_TYPES.LIST) && parsedOptions) {
        parsedOptions.forEach((option, index) => {
            // Validate ID length
            if (option.id && option.id.length > ENREACH_LIMITS.OPTION_ID_MAX_LENGTH) {
                if (executeFunctions) {
                    throw createUserFriendlyError(
                        executeFunctions,
                        EnreachErrorCode.VALIDATION_OPTION_ID_TOO_LONG,
                        { index: index + 1, length: option.id.length, max: ENREACH_LIMITS.OPTION_ID_MAX_LENGTH },
                        itemIndex
                    );
                } else {
                    throw new Error(`Option ${index + 1} ID is too long. Maximum ${ENREACH_LIMITS.OPTION_ID_MAX_LENGTH} characters allowed. Current: ${option.id.length} characters`);
                }
            }
            // Validate title length for button type
            if (type === MESSAGE_TYPES.BUTTON && option.title && option.title.length > ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH) {
                if (executeFunctions) {
                    throw createUserFriendlyError(
                        executeFunctions,
                        EnreachErrorCode.VALIDATION_OPTION_TITLE_TOO_LONG,
                        { index: index + 1, length: option.title.length, max: ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH },
                        itemIndex
                    );
                } else {
                    throw new Error(`Option ${index + 1} title is too long. Maximum ${ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH} characters allowed. Current: ${option.title.length} characters`);
                }
            }
        });
    }
}

/**
 * Parse and validate options for messages
 */
export function parseOptions(options: string | object | undefined, type: string, isManual: boolean = false): EnreachOption[] {
    let parsedOptions: EnreachOption[] = [];
    
    if (isManual && options) {
        // Handle manual mapping format from fixedCollection
        const manualOptions = options as ManualOptions;
        if (manualOptions.fields && Array.isArray(manualOptions.fields)) {
            // Fields are already in the correct format
            parsedOptions = manualOptions.fields;
        }
    } else {
        // Handle JSON format (original)
        try {
            if (typeof options === 'string') {
                parsedOptions = JSON.parse(options);
            } else if (Array.isArray(options)) {
                parsedOptions = options;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
            throw new Error(`Failed to parse options JSON: ${errorMessage}. Please provide valid JSON array.`);
        }
    }

    // Validate options for list type
    if (type === MESSAGE_TYPES.LIST && parsedOptions.length < ENREACH_LIMITS.LIST_MIN_OPTIONS) {
        throw new Error(`List type requires a minimum of ${ENREACH_LIMITS.LIST_MIN_OPTIONS} options`);
    }

    return parsedOptions;
}

/**
 * Build message body for Enreach API
 */
export function buildMessageBody(
    type: string,
    jwt: string,
    text: string,
    parsedOptions: EnreachOption[],
    buttonTitle?: string,
    resumUrl?: string
): EnreachMessageBody {
    const messageBody: EnreachMessageBody = {
        type,
        text,
    };

    // Only include options for types that use them
    if (parsedOptions.length > 0) {
        messageBody.options = parsedOptions;
    }

    // Add JWT if provided (not empty)
    if (jwt) {
        messageBody.jwt = jwt;
    }

    // Add resumUrl if provided (for sendAndWait)
    // Note: Enreach API uses 'resumUrl' (without 'e')
    if (resumUrl) {
        messageBody.resumUrl = resumUrl;
    }

    // Add buttonTitle only for list type
    if (type === MESSAGE_TYPES.LIST && buttonTitle) {
        messageBody.buttonTitle = buttonTitle;
    }

    return messageBody;
}

/**
 * Send message via Enreach API
 */
export async function sendEnreachMessage(
    executeFunctions: IExecuteFunctions,
    callbackUrl: string,
    messageBody: EnreachMessageBody,
): Promise<IDataObject> {
    // Mirror the JWT into the X-Callback-Auth-Token header so Enreach can authenticate
    // via header (new scheme) while body.jwt remains for backward compatibility
    const headers: Record<string, string> = {};
    if (messageBody.jwt) {
        headers['X-Callback-Auth-Token'] = messageBody.jwt;
    }

    const response = await executeFunctions.helpers.httpRequest({
        method: 'POST',
        url: callbackUrl,
        body: messageBody,
        headers,
        json: true,
        returnFullResponse: false
    });

    return response as IDataObject;
}

/**
 * Extract and parse options from node parameters
 */
function extractAndParseOptions(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
    type: string
): EnreachOption[] {
    if (type !== MESSAGE_TYPES.LIST && type !== MESSAGE_TYPES.BUTTON) {
        return [];
    }

    const optionsInputMode = executeFunctions.getNodeParameter('optionsInputMode', itemIndex, 'json') as string;

    if (optionsInputMode === 'manual') {
        const paramName = type === MESSAGE_TYPES.BUTTON ? 'optionsManualButton' : 'optionsManual';
        const options = executeFunctions.getNodeParameter(paramName, itemIndex, {}) as object;
        return parseOptions(options, type, true);
    } else {
        const options = executeFunctions.getNodeParameter('options', itemIndex, '[]') as string | object;
        return parseOptions(options, type, false);
    }
}

/**
 * Extract and validate message parameters
 */
function extractMessageParameters(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
    operation: 'sendAndWait' | 'sendMessage'
): {
    type: string;
    text: string;
    jwt: string;
    callbackUrl: string;
    parsedOptions: EnreachOption[];
    buttonTitle?: string;
    resumUrl?: string;
} {
    const type = executeFunctions.getNodeParameter('type', itemIndex) as string;
    const text = executeFunctions.getNodeParameter('text', itemIndex) as string;

    let callbackUrl: string = '';
    let jwt: string = '';

    // triggerNodeName is now shown for all operations
    const triggerNodeName = executeFunctions.getNodeParameter('triggerNodeName', itemIndex, 'Enreach Trigger') as string;

    try {
        callbackUrl = executeFunctions.getNodeParameter('callbackUrl', itemIndex) as string;

        // Callback token received by the trigger: Enreach requires it back whatever the auth method
        const callbackToken = executeFunctions.getNodeParameter('jwt', itemIndex, '');
        jwt = typeof callbackToken === 'string' ? callbackToken : '';
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes("doesn't exist") || errorMessage.includes("not found")) {
            throw createUserFriendlyError(
                executeFunctions,
                EnreachErrorCode.CONFIG_MISSING_TRIGGER,
                { nodeName: triggerNodeName },
                itemIndex
            );
        }
        throw error;
    }

    const parsedOptions = extractAndParseOptions(executeFunctions, itemIndex, type);
    const buttonTitle = type === MESSAGE_TYPES.LIST
        ? executeFunctions.getNodeParameter('buttonTitle', itemIndex) as string
        : undefined;

    validateMessageParameters(type, text, buttonTitle, parsedOptions, executeFunctions, itemIndex);

    const resumUrl = operation === 'sendAndWait'
        ? executeFunctions.evaluateExpression('{{ $execution.resumeUrl }}', itemIndex) as string
        : undefined;

    return { type, text, jwt, callbackUrl, parsedOptions, buttonTitle, resumUrl };
}

/**
 * Process and send message with response formatting
 */
async function processMessageCommon(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
    operation: 'sendAndWait' | 'sendMessage'
): Promise<{ sentData: EnreachSentData; messageBody: EnreachMessageBody }> {
    // Extract and validate all parameters
    const params = extractMessageParameters(executeFunctions, itemIndex, operation);

    // Build message body
    const messageBody = buildMessageBody(
        params.type,
        params.jwt,
        params.text,
        params.parsedOptions,
        params.buttonTitle,
        params.resumUrl
    );

    // Send message
    const httpResponse = await sendEnreachMessage(
        executeFunctions,
        params.callbackUrl,
        messageBody,
    );

    // Format response - omit JWT from stored data for security
    const sanitizedBody: EnreachMessageBody = { ...messageBody };
    delete sanitizedBody.jwt;

    const sentData: EnreachSentData = {
        sentRequest: {
            resource: 'message',
            operation,
            type: params.type,
            callbackUrl: params.callbackUrl,
            body: sanitizedBody,
        },
        sendResponse: httpResponse as IDataObject,
    } as EnreachSentData;

    if (operation === 'sendAndWait') {
        sentData.status = 'sent_waiting_for_response';
        sentData.message = 'Message sent successfully. Waiting for webhook response...';
        sentData.resumUrl = params.resumUrl;
    } else {
        sentData.status = 'sent';
        sentData.message = 'Message sent successfully';
    }

    return { sentData, messageBody };
}

/**
 * Process message send and wait operation.
 * On first run: sends the message and calls putExecutionToWait().
 * On resume (webhook fires): returns the webhook response data.
 */
export async function processSendAndWait(
    executeFunctions: IExecuteFunctions,
    itemIndex: number
): Promise<INodeExecutionData> {
    // Send message to Enreach, then wait for webhook resume
    const { sentData } = await processMessageCommon(
        executeFunctions,
        itemIndex,
        'sendAndWait'
    );

    // Configure wait timeout
    const limitWaitTime = executeFunctions.getNodeParameter('limitWaitTime', itemIndex) as boolean;
    let waitTimeout: Date | undefined;

    if (limitWaitTime) {
        const limitType = executeFunctions.getNodeParameter('limitType', itemIndex) as string;
        const dateTime = executeFunctions.getNodeParameter('dateTime', itemIndex, '') as string;
        const amount = executeFunctions.getNodeParameter('amount', itemIndex, 1) as number;
        const unit = executeFunctions.getNodeParameter('unit', itemIndex, 'hours') as string;

        waitTimeout = calculateTimeout(limitWaitTime, limitType, dateTime, amount, unit);
    }

    // Handle timeout configuration
    let finalTimeout: Date;

    if (limitWaitTime && waitTimeout) {
        const adjustedTime = waitTimeout.getTime() - TIMEOUT_CONFIG.PROCESSING_BUFFER_MS;
        finalTimeout = new Date(Math.max(adjustedTime, Date.now() + TIMEOUT_CONFIG.MIN_TIMEOUT_MS));
    } else {
        // No timeout limit - wait up to 1 year for webhook response
        finalTimeout = new Date(Date.now() + TIMEOUT_CONFIG.DEFAULT_WAIT_YEARS * 365 * TIME_UNITS.days);
    }

    await executeFunctions.putExecutionToWait(finalTimeout);

    // After putExecutionToWait resolves (on webhook resume), capture webhook data
    const webhookData = executeFunctions.getInputData();
    if (webhookData && webhookData.length > 0) {
        sentData.webhookResponse = webhookData[0].json;
        sentData.status = 'response_received';
        sentData.message = 'Webhook response received successfully';
    }

    return {
        json: sentData,
        pairedItem: { item: itemIndex },
    };
}

/**
 * Process message send operation (without waiting)
 */
export async function processSendMessage(
    executeFunctions: IExecuteFunctions,
    itemIndex: number
): Promise<INodeExecutionData> {
    // Process common logic
    const { sentData, messageBody } = await processMessageCommon(
        executeFunctions,
        itemIndex,
        'sendMessage'
    );

    // Return simplified output for sendMessage
    return {
        json: {
            status: sentData.status,
            message: sentData.message,
            type: messageBody.type,
            text: messageBody.text,
        },
        pairedItem: { item: itemIndex },
    };
}

/**
 * Read a header value from the webhook request (n8n lowercases header names)
 */
function readHeader(webhookFunctions: IWebhookFunctions, name: string): string {
    try {
        const headers = webhookFunctions.getHeaderData() as Record<string, unknown> | undefined;
        const raw = headers?.[name.toLowerCase()] ?? headers?.[name];
        return typeof raw === 'string' ? raw.trim() : '';
    } catch {
        return '';
    }
}

/**
 * Extract the JWT from an "Authorization: Bearer <JWT>" header value
 */
function extractBearerToken(authorizationHeader: string): string {
    const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader);
    return match ? match[1] : '';
}

/**
 * Reject the webhook call with a real HTTP error status
 * (a webhookResponse would be sent with HTTP 200)
 */
function rejectWebhook(
    webhookFunctions: IWebhookFunctions,
    error: { status: number; error: string; message: string },
): IWebhookResponseData {
    webhookFunctions.getResponseObject().status(error.status).json({
        error: error.error,
        message: error.message,
    });
    return { noWebhookResponse: true };
}

/**
 * Extract the callback token Enreach expects back on calls to callbackUrl.
 * It is opaque to n8n (signed with a platform key) and must never be validated here.
 * Header X-Callback-Auth-Token takes priority over the legacy body.jwt field.
 */
function extractCallbackToken(webhookFunctions: IWebhookFunctions, bodyData: IDataObject): string {
    const headerToken = readHeader(webhookFunctions, 'X-Callback-Auth-Token');
    if (headerToken) {
        return headerToken;
    }

    const bodyToken = bodyData.jwt;
    return typeof bodyToken === 'string' ? bodyToken : '';
}

/**
 * Handle webhook response
 */
export async function handleWebhook(webhookFunctions: IWebhookFunctions, authMethod?: string): Promise<IWebhookResponseData> {
    const bodyData = webhookFunctions.getBodyData();

    // Use provided authMethod, or detect from context -- fail-closed
    let finalAuthMethod = authMethod;
    if (!finalAuthMethod) {
        try {
            finalAuthMethod = webhookFunctions.getNodeParameter('authMethod') as string;
        } catch {
            // Fail-closed: require auth when method cannot be determined
            finalAuthMethod = 'jwtAuth';
        }
    }

    const authorizationHeader = readHeader(webhookFunctions, 'Authorization');
    const bearerToken = extractBearerToken(authorizationHeader);

    if (finalAuthMethod !== 'none' && authorizationHeader && !bearerToken) {
        return rejectWebhook(webhookFunctions, {
            status: 401,
            error: 'Unauthorized',
            message: 'Authorization header must use the Bearer scheme',
        });
    }

    const authResult = await validateWebhookAuth(webhookFunctions, bearerToken, finalAuthMethod);

    if (!authResult.isValid) {
        return rejectWebhook(
            webhookFunctions,
            authResult.error ?? { status: 401, error: 'Unauthorized', message: 'Authentication failed' },
        );
    }

    // Expose the callback token under body.jwt so downstream expressions
    // (e.g. $($parameter.triggerNodeName).item.json.jwt) work regardless of source.
    // A non-string body.jwt is dropped so it never reaches the X-Callback-Auth-Token header.
    const callbackToken = extractCallbackToken(webhookFunctions, bodyData);
    const workflowJson: IDataObject = { ...bodyData };
    delete workflowJson.jwt;
    if (callbackToken) {
        workflowJson.jwt = callbackToken;
    }

    return {
        workflowData: [[{ json: workflowJson }]],
    };
}
