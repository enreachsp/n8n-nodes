import {
    IExecuteFunctions,
    IHookFunctions,
    IWebhookFunctions,
    INodeType,
    INodeTypeDescription,
    INodeExecutionData,
    IWebhookResponseData,
    ApplicationError,
    NodeConnectionTypes,
    NodeOperationError,
} from 'n8n-workflow';

import {
    processSendAndWait,
    processSendMessage,
    handleWebhook,
} from '../utils/EnreachUtils';
import { enreachCredentialTest } from '../utils/credentialTest';

export class Enreach implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Enreach',
        name: 'enreach',
        icon: { light: 'file:enreach.svg', dark: 'file:enreach.dark.svg' },
        group: ['transform'],
        version: 1,
        documentationUrl: 'https://developer.sp.enreach.com/guide/n8n-node-custom-enreach-/node/node-enreach-%28-send-message-and-send-and-wait-%29',
        subtitle: '={{$parameter["operation"]}}',
        description: 'Interact with Enreach API for message and communication workflows',
        defaults: {
            name: 'Enreach',
        },
        inputs: [NodeConnectionTypes.Main],
        outputs: [NodeConnectionTypes.Main],
        usableAsTool: true,
        credentials: [
            {
                name: 'enreachApi',
                required: false,
                testedBy: 'enreachCredentialTest',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait'],
                        authMethod: ['jwtAuth'],
                    },
                },
            },
            // n8n's built-in JWT Auth, kept for workflows created with older node versions
            {
                name: 'jwtAuth',
                required: false,
                displayOptions: {
                    show: {
                        operation: ['sendAndWait'],
                        authMethod: ['jwtAuth'],
                    },
                },
            },
        ],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'POST',
                responseMode: 'onReceived',
                responseData: '',
                path: '',
                restartWebhook: true,
                isFullPath: true,
            },
        ],
        properties: [
            // Operation selector - primary control
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Send and Wait',
                        value: 'sendAndWait',
                        description: 'Send a message and wait for response',
                        action: 'Send message and wait for response',
                    },
                    {
                        name: 'Send Message',
                        value: 'sendMessage',
                        description: 'Send a message without waiting for response',
                        action: 'Send message',
                    },
                ],
                default: 'sendAndWait',
                required: true,
            },
            // Authentication - shown after operation selection
            {
                displayName: 'Authentication',
                name: 'authMethod',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        operation: ['sendAndWait'],
                    },
                },
                options: [
                    {
                        name: 'None',
                        value: 'none',
                        description: 'Accept all webhook requests without authentication',
                    },
                    {
                        name: 'JWT Auth',
                        value: 'jwtAuth',
                        description: 'Validate the JWT from the Authorization: Bearer header with the configured secret',
                    },
                ],
                default: 'jwtAuth',
                description: 'Choose how to authenticate incoming webhook requests',
                required: true,
            },

            // Trigger Node Name -- shown for all operations that need callbackUrl
            {
                displayName: 'Trigger Node Name',
                name: 'triggerNodeName',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                    },
                },
                default: 'Enreach Trigger',
                placeholder: 'Enreach Trigger',
                description: 'Name of the Enreach Trigger node to get the callback URL and JWT from',
                hint: 'Enter the exact name of the Enreach Trigger node in this workflow',
            },

            // Message Type
            {
                displayName: 'Type',
                name: 'type',
                type: 'options',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                    },
                },
                options: [
                    {
                        name: 'List',
                        value: 'list',
                        description: 'Send a list message (minimum 3 options required)',
                    },
                    {
                        name: 'Button',
                        value: 'button',
                        description: 'Send a button message',
                    },
                    {
                        name: 'Text',
                        value: 'text',
                        description: 'Send a text message',
                    },
                    {
                        name: 'Annotation',
                        value: 'annotation',
                        description: 'Send an annotation message',
                    },
                ],
                default: 'text',
                required: true,
            },

            // Message Authentication - Hidden fields that get values from input data
            {
                displayName: 'Callback Token (Auto)',
                name: 'jwt',
                type: 'hidden',
                default: '={{ $($parameter.triggerNodeName).item.json.jwt }}',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                    },
                },
            },
            {
                displayName: 'Callback URL (Auto)',
                name: 'callbackUrl',
                type: 'hidden',
                default: '={{ $($parameter.triggerNodeName).item.json.callbackUrl }}',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                    },
                },
            },

            // Message Content
            {
                displayName: 'Button Title',
                name: 'buttonTitle',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                        type: ['list'],
                    },
                },
                typeOptions: {
                    maxLength: 20,
                },
                default: 'choose an option',
                placeholder: 'Choose an option (max 20 chars)',
                description: 'Title for the button (max 20 characters, only for list type)',
                hint: 'Maximum 20 characters',
            },
            {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                    },
                },
                typeOptions: {
                    maxLength: 1024,
                    rows: 4,
                },
                default: '',
                placeholder: 'Enter your message text (max 1024 chars for list/button)',
                description: 'The text message to send (max 1024 characters for list and button types)',
                hint: 'Maximum 1024 characters for list and button types',
                required: true,
            },

            // Options Input Mode
            {
                displayName: 'Options Input Mode',
                name: 'optionsInputMode',
                type: 'options',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                        type: ['list', 'button'],
                    },
                },
                options: [
                    {
                        name: 'JSON',
                        value: 'json',
                        description: 'Provide options as JSON array',
                    },
                    {
                        name: 'Manual Mapping',
                        value: 'manual',
                        description: 'Define each option manually',
                    },
                ],
                default: 'manual',
                description: 'How to provide the options',
            },

            // JSON Options (original)
            {
                displayName: 'Options',
                name: 'options',
                type: 'json',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                        optionsInputMode: ['json'],
                        type: ['list', 'button'],
                    },
                },
                default: '[]',
                description: 'Options array (minimum 3 options for list type, any number for button type)',
            },

            // Manual Options Mapping for List
            {
                displayName: 'Options',
                name: 'optionsManual',
                type: 'fixedCollection',
                placeholder: 'Add Option',
                typeOptions: {
                    multipleValues: true,
                    maxValue: 10,
                },
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                        optionsInputMode: ['manual'],
                        type: ['list'],
                    },
                },
                default: {},
                description: 'Maximum 10 options allowed',
                options: [
                    {
                        name: 'fields',
                        displayName: 'Fields',
                        values: [
                            {
                                displayName: 'ID',
                                name: 'id',
                                type: 'string',
                                typeOptions: {
                                    maxLength: 256,
                                },
                                default: '',
                                required: true,
                                placeholder: 'Unique ID (max 256 chars)',
                                description: 'Option ID (max 256 characters)',
                                hint: 'Maximum 256 characters',
                            },
                            {
                                displayName: 'Title',
                                name: 'title',
                                type: 'string',
                                default: '',
                                required: true,
                                placeholder: 'Option title',
                                description: 'Display title for this option',
                            },
                            {
                                displayName: 'Description',
                                name: 'description',
                                type: 'string',
                                default: '',
                                placeholder: 'Optional description',
                                description: 'Optional description for this option',
                            },
                        ],
                    },
                ],
            },

            // Manual Options Mapping for Button
            {
                displayName: 'Options',
                name: 'optionsManualButton',
                type: 'fixedCollection',
                placeholder: 'Add Button',
                typeOptions: {
                    multipleValues: true,
                },
                displayOptions: {
                    show: {
                        operation: ['sendAndWait', 'sendMessage'],
                        optionsInputMode: ['manual'],
                        type: ['button'],
                    },
                },
                default: {},
                description: 'Define button options',
                options: [
                    {
                        name: 'fields',
                        displayName: 'Fields',
                        values: [
                            {
                                displayName: 'ID',
                                name: 'id',
                                type: 'string',
                                typeOptions: {
                                    maxLength: 256,
                                },
                                default: '',
                                required: true,
                                placeholder: 'Button ID (max 256 chars)',
                                description: 'Button ID (max 256 characters)',
                                hint: 'Maximum 256 characters',
                            },
                            {
                                displayName: 'Title',
                                name: 'title',
                                type: 'string',
                                typeOptions: {
                                    maxLength: 20,
                                },
                                default: '',
                                required: true,
                                placeholder: 'Button text (max 20 chars)',
                                description: 'Button title (max 20 characters)',
                                hint: 'Maximum 20 characters',
                            },
                        ],
                    },
                ],
            },

            // Wait Configuration
            {
                displayName: 'Limit Wait Time',
                name: 'limitWaitTime',
                type: 'boolean',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait'],
                    },
                },
                default: false,
                description: 'Whether to limit the time that the workflow will wait for a response',
            },
            {
                displayName: 'Wait Time Type',
                name: 'limitType',
                type: 'options',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait'],
                        limitWaitTime: [true],
                    },
                },
                options: [
                    {
                        name: 'Time Interval',
                        value: 'timeInterval',
                        description: 'Wait for a specific amount of time',
                    },
                    {
                        name: 'Specific Date/Time',
                        value: 'dateTime',
                        description: 'Wait until a specific date and time',
                    },
                ],
                default: 'timeInterval',
            },
            {
                displayName: 'Amount',
                name: 'amount',
                type: 'number',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait'],
                        limitWaitTime: [true],
                        limitType: ['timeInterval'],
                    },
                },
                typeOptions: {
                    minValue: 1,
                },
                default: 1,
                description: 'The amount of time to wait',
            },
            {
                displayName: 'Unit',
                name: 'unit',
                type: 'options',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait'],
                        limitWaitTime: [true],
                        limitType: ['timeInterval'],
                    },
                },
                options: [
                    {
                        name: 'Seconds',
                        value: 'seconds',
                    },
                    {
                        name: 'Minutes',
                        value: 'minutes',
                    },
                    {
                        name: 'Hours',
                        value: 'hours',
                    },
                    {
                        name: 'Days',
                        value: 'days',
                    },
                ],
                default: 'hours',
                description: 'The unit of the amount to wait',
            },
            {
                displayName: 'Date/Time',
                name: 'dateTime',
                type: 'dateTime',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait'],
                        limitWaitTime: [true],
                        limitType: ['dateTime'],
                    },
                },
                default: '',
                description: 'The date and time to wait until',
            },
        ],
    };

    methods = {
        credentialTest: { enreachCredentialTest },
    };

    // The webhook is the Send and Wait resume URL (restartWebhook), served by the
    // execution itself. There is nothing to register on the Enreach side, so the
    // lifecycle hooks are intentionally no-ops.
    webhookMethods = {
        default: {
            async checkExists(this: IHookFunctions): Promise<boolean> {
                return true;
            },
            async create(this: IHookFunctions): Promise<boolean> {
                return true;
            },
            async delete(this: IHookFunctions): Promise<boolean> {
                return true;
            },
        },
    };

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        // Get auth method from node parameters -- fail-closed: default to jwtAuth
        let authMethod: string;
        try {
            authMethod = this.getNodeParameter('authMethod') as string;
        } catch {
            // Fail-closed: require auth when parameter cannot be determined
            authMethod = 'jwtAuth';
        }
        return handleWebhook(this, authMethod);
    }

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const operation = this.getNodeParameter('operation', 0) as string;

        // ARCH-01: sendAndWait suspends the entire execution via putExecutionToWait(),
        // so only the first item would ever be processed. Reject multi-item input early.
        if (operation === 'sendAndWait' && items.length > 1) {
            throw new ApplicationError(
                'Send and Wait operation only supports a single input item. ' +
                'Use a "Limit" node or "Split In Batches" to process one item at a time.',
            );
        }

        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                let result: INodeExecutionData;

                if (operation === 'sendAndWait') {
                    result = await processSendAndWait(this, i);
                } else if (operation === 'sendMessage') {
                    result = await processSendMessage(this, i);
                } else {
                    throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported`);
                }

                returnData.push(result);
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                            itemIndex: i,
                            status: 'error',
                            operation: operation,
                        },
                        pairedItem: { item: i },
                    });
                } else {
                    throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
                }
            }
        }

        return [returnData];
    }

}