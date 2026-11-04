import {
    IExecuteFunctions,
    INodeType,
    INodeTypeDescription,
    INodeExecutionData,
    NodeConnectionTypes,
    NodeOperationError,
} from 'n8n-workflow';

import { processSendMessage } from '../utils/EnreachUtils';

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
        properties: [
            // Operation selector - primary control
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Send Message',
                        value: 'sendMessage',
                        description: 'Send a message to the Enreach conversation',
                        action: 'Send message',
                    },
                ],
                default: 'sendMessage',
                required: true,
            },

            // Trigger Node Name -- provides the callback URL and callback token
            {
                displayName: 'Trigger Node Name',
                name: 'triggerNodeName',
                type: 'string',
                displayOptions: {
                    show: {
                        operation: ['sendMessage'],
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
                        operation: ['sendMessage'],
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
                        operation: ['sendMessage'],
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
                        operation: ['sendMessage'],
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
                        operation: ['sendMessage'],
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
                        operation: ['sendMessage'],
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
                        operation: ['sendMessage'],
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
                        operation: ['sendMessage'],
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
                        operation: ['sendMessage'],
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
                        operation: ['sendMessage'],
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
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const operation = this.getNodeParameter('operation', 0) as string;

        const returnData: INodeExecutionData[] = [];

        for (let i = 0; i < items.length; i++) {
            try {
                if (operation === 'sendAndWait') {
                    // Removed in 2.0.0: community action nodes cannot declare webhooks
                    throw new NodeOperationError(
                        this.getNode(),
                        'The "Send and Wait" operation was removed in version 2.0.0. Use "Send Message" instead.',
                        { itemIndex: i },
                    );
                }
                if (operation !== 'sendMessage') {
                    throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not supported`);
                }

                returnData.push(await processSendMessage(this, i));
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