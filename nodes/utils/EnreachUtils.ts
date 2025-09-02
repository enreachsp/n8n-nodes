import {
    IExecuteFunctions,
    INodeExecutionData,
    IWebhookFunctions,
    IWebhookResponseData,
    IDataObject,
} from 'n8n-workflow';
import { JwtValidator } from './JwtValidator';
import { ENREACH_LIMITS, TIMEOUT_CONFIG, TIME_UNITS, MESSAGE_TYPES } from './constants';

export interface EnreachOption {
    id: string;
    title: string;
    description?: string;
}

export interface ManualOptionField {
    id: string;
    title: string;
    description?: string;
}

export interface ManualOptions {
    fields: ManualOptionField[];
}

export interface EnreachMessageBody {
    type: string;
    jwt: string;
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
        return new Date(dateTime);
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
    parsedOptions: EnreachOption[]
): void {
    // Validate text length for list and button types
    if ((type === MESSAGE_TYPES.LIST || type === MESSAGE_TYPES.BUTTON) && text && text.length > ENREACH_LIMITS.TEXT_MAX_LENGTH) {
        throw new Error(`Text message is too long. Maximum ${ENREACH_LIMITS.TEXT_MAX_LENGTH} characters allowed for ${type} type. Current: ${text.length} characters`);
    }

    // Validate buttonTitle length - only for list type
    if (buttonTitle && buttonTitle.length > ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH) {
        throw new Error(`Button title is too long. Maximum ${ENREACH_LIMITS.BUTTON_TITLE_MAX_LENGTH} characters allowed. Current: ${buttonTitle.length} characters`);
    }

    // Validate maximum options limit for list
    if (type === MESSAGE_TYPES.LIST && parsedOptions && parsedOptions.length > ENREACH_LIMITS.LIST_MAX_OPTIONS) {
        throw new Error(`Too many options provided. Maximum ${ENREACH_LIMITS.LIST_MAX_OPTIONS} options allowed for list type. Current: ${parsedOptions.length} options`);
    }

    // Validate options structure and limits for both list and button types
    if ((type === 'button' || type === 'list') && parsedOptions) {
        parsedOptions.forEach((option, index) => {
            // Validate ID length (256 character limit)
            if (option.id && option.id.length > 256) {
                throw new Error(`Option ${index + 1} ID is too long. Maximum 256 characters allowed. Current: ${option.id.length} characters`);
            }
            // Validate title length (20 character limit) for button type
            if (type === 'button' && option.title && option.title.length > 20) {
                throw new Error(`Option ${index + 1} title is too long. Maximum 20 characters allowed. Current: ${option.title.length} characters`);
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
            // For both list and button types, use the ID provided by user
            parsedOptions = manualOptions.fields.map((field: ManualOptionField) => {
                const option: EnreachOption = {
                    id: field.id || '',
                    title: field.title || '',
                };
                
                // Add description if provided (only for list type)
                if (field.description) {
                    option.description = field.description;
                }
                
                return option;
            });
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
            parsedOptions = [];
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
        jwt,
        text,
        options: parsedOptions,
    };

    // Add resumUrl if provided (for sendAndWait)
    // Note: Enreach API expects 'resumUrl' not 'resumeUrl'
    if (resumeUrl) {
        messageBody.resumUrl = resumeUrl;
    }

    // Add buttonTitle only for list type
    if (type === 'list' && buttonTitle) {
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
    messageBody: EnreachMessageBody
): Promise<IDataObject> {
    return await executeFunctions.helpers.request({
        method: 'POST',
        url: callbackUrl,
        body: messageBody,
        json: true,
        headers: {
            'Content-Type': 'application/json',
        },
    });
}

/**
 * Extract and parse options from node parameters
 */
function extractAndParseOptions(
    executeFunctions: IExecuteFunctions,
    itemIndex: number,
    type: string
): EnreachOption[] {
    if (type !== 'list' && type !== 'button') {
        return [];
    }

    const optionsInputMode = executeFunctions.getNodeParameter('optionsInputMode', itemIndex, 'json') as string;
    
    if (optionsInputMode === 'manual') {
        const paramName = type === 'button' ? 'optionsManualButton' : 'optionsManual';
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
async function processMessageCommon(
    executeFunctions: IExecuteFunctions,
    items: INodeExecutionData[],
    itemIndex: number,
    operation: 'sendAndWait' | 'sendMessage'
): Promise<{ sentData: EnreachSentData; messageBody: EnreachMessageBody }> {
    // Extract common parameters
    const type = executeFunctions.getNodeParameter('type', itemIndex) as string;
    const callbackUrl = executeFunctions.getNodeParameter('callbackUrl', itemIndex) as string;
    const jwt = executeFunctions.getNodeParameter('jwt', itemIndex) as string;
    const text = executeFunctions.getNodeParameter('text', itemIndex) as string;
    
    // Parse and validate options
    const parsedOptions = extractAndParseOptions(executeFunctions, itemIndex, type);

    // Get button title
    const buttonTitle = type === 'list' 
        ? executeFunctions.getNodeParameter('buttonTitle', itemIndex) as string 
        : undefined;

    // Validate message parameters before sending
    validateMessageParameters(type, text, buttonTitle, parsedOptions);

    // Build message body
    const resumeUrl = operation === 'sendAndWait' 
        ? executeFunctions.evaluateExpression('{{ $execution.resumeUrl }}', 0) as string
        : undefined;
    const messageBody = buildMessageBody(type, jwt, text, parsedOptions, buttonTitle, resumeUrl);

    // Send HTTP request to Enreach API
    const httpResponse = await sendEnreachMessage(executeFunctions, callbackUrl, messageBody);

    // Create base sent data structure
    const sentData: EnreachSentData = {
        // Request information
        sentRequest: {
            resource: 'message',
            operation,
            type,
            callbackUrl,
            body: messageBody,
        },
        
        // HTTP response
        sendResponse: httpResponse as IDataObject,
    } as EnreachSentData;

    if (operation === 'sendAndWait') {
        sentData.status = 'sent_waiting_for_response';
        sentData.message = 'Message sent successfully. Waiting for webhook response...';
        sentData.resumeUrl = resumeUrl;
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
        items,
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
        // User has configured a specific timeout
        const adjustedTime = waitTimeout.getTime() - TIMEOUT_CONFIG.PROCESSING_BUFFER_MS;
        finalTimeout = new Date(Math.max(adjustedTime, Date.now() + TIMEOUT_CONFIG.MIN_TIMEOUT_MS));
        
        // Timeout configured with -1s adjustment for n8n processing overhead
    } else {
        // No timeout configured - wait for configured default period (effectively indefinite)
        finalTimeout = new Date(Date.now() + TIMEOUT_CONFIG.DEFAULT_WAIT_YEARS * 365 * TIME_UNITS.days);
        // No timeout limit configured - waiting up to 1 year for webhook response
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
        items,
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
            // Include response status code if available
            responseStatus: sentData.sendResponse?.statusCode || 200,
        },
        pairedItem: { item: itemIndex },
    };
}

/**
 * Handle webhook response
 */
export async function handleWebhook(webhookFunctions: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = webhookFunctions.getBodyData();
    
    // JWT authentication is always required now
    try {
        // Get JWT credentials
        const credentials = await webhookFunctions.getCredentials('jwtAuth');
        
        if (!credentials) {
            return {
                webhookResponse: {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        error: 'Unauthorized',
                        message: 'JWT credentials not configured'
                    }),
                },
            };
        }
        
        // Extract secret based on key type
        const jwtSecret = JwtValidator.extractJwtSecret(credentials);
        
        // Extract JWT from body
        const jwt = bodyData.jwt as string;
        
        if (!jwt) {
            return {
                webhookResponse: {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        error: 'Unauthorized',
                        message: 'JWT token missing in webhook response'
                    }),
                },
            };
        }
        
        // Validate JWT (skip expiry check by default for responses)
        const validateExpiry = false;
        const isValid = JwtValidator.validateJWT(jwt, jwtSecret, validateExpiry);
        
        if (!isValid) {
            return {
                webhookResponse: {
                    status: 401,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        error: 'Unauthorized',
                        message: 'Invalid JWT token in webhook response'
                    }),
                },
            };
        }
        
    } catch (error) {
        // JWT authentication error in webhook response
        return {
            webhookResponse: {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    error: 'Authentication failed',
                    message: 'JWT validation error in webhook response'
                }),
            },
        };
    }

    return {
        workflowData: [
            [
                {
                    json: bodyData,
                },
            ],
        ],
    };
}