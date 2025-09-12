import {
    IExecuteFunctions,
    IWebhookFunctions,
    INodeType,
    INodeTypeDescription,
    INodeExecutionData,
    IWebhookResponseData,
    NodeConnectionType,
} from 'n8n-workflow';

import {
    processSendAndWait,
    processSendMessage,
    handleWebhook,
} from '../utils/EnreachUtils';

export class Enreach implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Enreach',
        name: 'enreach',
        icon: 'file:enreach.svg',
        group: ['communication'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Interact with Enreach API for message and communication workflows',
        defaults: {
            name: 'Enreach',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        credentials: [
            {
                name: 'jwtAuth',
                required: true,
            },
        ],
        webhooks: [
            {
                name: 'default',
                httpMethod: 'GET',
                responseMode: 'onReceived',
                responseData: '',
                path: '',
                restartWebhook: true,
                isFullPath: true,
            },
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
            // Important Notice
            {
                displayName: 'Auto-Detection Notice',
                name: 'autoDetectionNotice',
                type: 'notice',
                default: '',
                description: '⚠️ JWT and Callback URL are auto-detected from the workflow. They first check the previous node, then look for "Enreach Trigger" node. For "Send and Wait" operation, you can specify a different trigger node name.',
            },
            
            // Trigger Node Selection
            {
                displayName: 'Trigger Node Name',
                name: 'triggerNodeName',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['sendAndWait'],
                    },
                },
                default: 'Enreach Trigger',
                placeholder: 'Enreach Trigger',
                description: 'Name of the trigger node to get JWT and callback URL from. You can reference a specific trigger node if you have multiple triggers in your workflow.',
                hint: 'Enter the exact name of your Enreach Trigger node',
                required: false,
            },
            
            // Message Operations
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
                displayName: 'JWT Token (Auto)',
                name: 'jwt',
                type: 'hidden',
                default: '={{ $parameter.triggerNodeName ? $($parameter.triggerNodeName).item.json.jwt : ($json.jwt || $("Enreach Trigger").item.json.jwt) }}',
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
                default: '={{ $parameter.triggerNodeName ? $($parameter.triggerNodeName).item.json.callbackUrl : ($json.callbackUrl || $("Enreach Trigger").item.json.callbackUrl) }}',
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
                required: false,
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
                default: 'Manual Mapping',
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
                required: false,
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

    async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
        return handleWebhook(this);
    }

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const operation = this.getNodeParameter('operation', 0) as string;
        
        const returnData: INodeExecutionData[] = [];
        const errorData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                let result: INodeExecutionData;
                
                if (operation === 'sendAndWait') {
                    result = await processSendAndWait(this, items, i);
                } else if (operation === 'sendMessage') {
                    result = await processSendMessage(this, items, i);
                } else {
                    throw new Error(`The operation "${operation}" is not supported`);
                }
                
                returnData.push(result);
            } catch (error) {
                if (this.continueOnFail()) {
                    const errorItem = {
                        json: {
                            error: (error as Error).message,
                            originalInput: items[i].json,
                            itemIndex: i,
                            status: 'error',
                            operation: operation,
                        },
                        pairedItem: { item: i },
                    };
                    
                    // Check if error output is enabled (Continue using error output)
                    // If continueOnFail is true but no error output, add to main output
                    // n8n handles this automatically based on user settings
                    errorData.push(errorItem);
                } else {
                    // Stop workflow on error
                    throw error;
                }
            }
        }

        // n8n automatically detects if "Continue (using error output)" is selected
        // and expects 2 arrays when error output is enabled
        // The second output is only visible in UI when user selects that option
        if (errorData.length > 0) {
            // Return both success and error data
            // n8n will route them to appropriate outputs based on settings
            return [returnData, errorData];
        }
        
        // If no errors or error output not enabled, return single array
        return [returnData];
    }

}