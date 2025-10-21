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
    resumUrl?: string;  // Note: Enreach uses 'resumUrl' not 'resumeUrl'
    text: string;
    options: EnreachOption[];
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
    resumeUrl?: string;
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
    if (unitMultiplier) {
        additionalMs = amount * unitMultiplier;
    }

    const timeout = new Date(now + additionalMs);

    return timeout;
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
            // Validate ID length (256 character limit)
            if (option.id && option.id.length > 256) {
                throw new Error(`Option ${index + 1} ID is too long. Maximum 256 characters allowed. Current: ${option.id.length} characters`);
            }
            // Validate title length (20 character limit) for button type
            if (type === MESSAGE_TYPES.BUTTON && option.title && option.title.length > ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH) {
                throw new Error(`Option ${index + 1} title is too long. Maximum ${ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH} characters allowed. Current: ${option.title.length} characters`);
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
            } else if (options) {
                parsedOptions = options as EnreachOption[];
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
    resumeUrl?: string
): EnreachMessageBody {
    const messageBody: EnreachMessageBody = {
        type,
        text,
        options: parsedOptions,
    };

    // Add JWT if provided (not empty)
    if (jwt) {
        messageBody.jwt = jwt;
    }

    // Add resumUrl if provided (for sendAndWait)
    // Note: Enreach API expects 'resumUrl' not 'resumeUrl'
    if (resumeUrl) {
        messageBody.resumUrl = resumeUrl;
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
    itemIndex: number = 0
): Promise<IDataObject> {
    const response = await executeFunctions.helpers.httpRequest({
        method: 'POST',
        url: callbackUrl,
        body: messageBody,
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
 * Common message processing logic
 */
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
    resumeUrl?: string;
} {
    const type = executeFunctions.getNodeParameter('type', itemIndex) as string;
    const text = executeFunctions.getNodeParameter('text', itemIndex) as string;
    // For sendMessage, always use 'none' (no auth needed)
    const authMethod = operation === 'sendMessage'
        ? 'none'
        : executeFunctions.getNodeParameter('authMethod', itemIndex, 'jwtAuth') as string;

    let callbackUrl: string = '';
    let jwt: string = '';

    // Always try to get callbackUrl, regardless of auth method
    const triggerNodeName = operation === 'sendAndWait'
        ? executeFunctions.getNodeParameter('triggerNodeName', itemIndex, 'Enreach Trigger') as string
        : 'Enreach Trigger';

    try {
        callbackUrl = executeFunctions.getNodeParameter('callbackUrl', itemIndex) as string;

        // Only get JWT if auth method requires it
        if (authMethod === 'jwtAuth') {
            jwt = executeFunctions.getNodeParameter('jwt', itemIndex) as string;
        }
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

    const resumeUrl = operation === 'sendAndWait'
        ? executeFunctions.evaluateExpression('{{ $execution.resumeUrl }}', itemIndex) as string
        : undefined;

    return { type, text, jwt, callbackUrl, parsedOptions, buttonTitle, resumeUrl };
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
        params.resumeUrl
    );

    // Send message
    const httpResponse = await sendEnreachMessage(
        executeFunctions,
        params.callbackUrl,
        messageBody,
        itemIndex
    );

    // Format response
    const sentData: EnreachSentData = {
        sentRequest: {
            resource: 'message',
            operation,
            type: params.type,
            callbackUrl: params.callbackUrl,
            body: messageBody,
        },
        sendResponse: httpResponse as IDataObject,
    } as EnreachSentData;

    if (operation === 'sendAndWait') {
        sentData.status = 'sent_waiting_for_response';
        sentData.message = 'Message sent successfully. Waiting for webhook response...';
        sentData.resumeUrl = params.resumeUrl;
    } else {
        sentData.status = 'sent';
        sentData.message = 'Message sent successfully';
    }

    return { sentData, messageBody };
}

/**
 * Process message send and wait operation
 */
export async function processSendAndWait(
    executeFunctions: IExecuteFunctions,
    items: INodeExecutionData[],
    itemIndex: number
): Promise<INodeExecutionData> {
    // Process common logic
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
        // User configured timeout with -1s buffer for n8n processing overhead
        const adjustedTime = waitTimeout.getTime() - TIMEOUT_CONFIG.PROCESSING_BUFFER_MS;
        finalTimeout = new Date(Math.max(adjustedTime, Date.now() + TIMEOUT_CONFIG.MIN_TIMEOUT_MS));
    } else {
        // No timeout limit - wait up to 1 year for webhook response
        finalTimeout = new Date(Date.now() + TIMEOUT_CONFIG.DEFAULT_WAIT_YEARS * 365 * TIME_UNITS.days);
    }
    
    await executeFunctions.putExecutionToWait(finalTimeout);

    // This code will execute when the webhook resumes the execution
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
    items: INodeExecutionData[],
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
 * Handle webhook response
 */
export async function handleWebhook(webhookFunctions: IWebhookFunctions, authMethod?: string): Promise<IWebhookResponseData> {
    const bodyData = webhookFunctions.getBodyData();
    const jwt = bodyData.jwt as string;

    // Use provided authMethod, or detect from context
    let finalAuthMethod = authMethod;
    if (!finalAuthMethod) {
        // Try to get auth method from node parameters if available
        try {
            finalAuthMethod = webhookFunctions.getNodeParameter('authMethod') as string;
        } catch {
            // Default to 'none' if can't determine auth method
            finalAuthMethod = 'none';
        }
    }

    const authResult = await validateWebhookAuth(webhookFunctions, jwt, finalAuthMethod);

    if (!authResult.isValid) {
        return {
            webhookResponse: {
                status: authResult.error!.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: authResult.error!.error,
                    message: authResult.error!.message
                }),
            },
        };
    }

    // Return the body data as workflow data
    return {
        workflowData: [[{ json: bodyData }]],
    };
}