import {
    IExecuteFunctions,
    INodeType,
    INodeTypeDescription,
    INodeExecutionData,
    NodeConnectionType,
    NodeOperationError,
    IHttpRequestMethods,
    IDataObject,
} from 'n8n-workflow';

// Interfaces pour une meilleure typologie
interface EnreachCredentials {
    jwt: string;
    callbackUrl: string;
}

interface EnreachMessageParams {
    text: string;
    type: 'text' | 'annotation' | 'button' | 'list';
    options?: Array<{ id: string; title: string; description?: string }>;
    buttonTitle?: string;
}

interface EnreachRequestBody {
    type: string;
    jwt: string;
    text: string;
    options?: any[];
    buttonTitle?: string;
}

export class EnreachTool implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Enreach Tool',
        name: 'enreachTool',
        icon: 'file:enreach.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{ $parameter["type"] || "Send Message" }}',
        description: 'Send messages through Enreach API - Tool for AI Agents',
        defaults: {
            name: 'Enreach Tool',
        },
        inputs: [NodeConnectionType.Main],
        outputs: [NodeConnectionType.Main],
        usableAsTool: true,
        credentials: [
            {
                name: 'enreachApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Tool Description',
                name: 'toolDescription',
                type: 'string',
                default: 'Send messages via Enreach (SMS/WhatsApp). Supports text, annotation, button and list message types.',
                required: false,
                typeOptions: {
                    rows: 2,
                },
            },
            {
                displayName: 'Message Type',
                name: 'type',
                type: 'options',
                options: [
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
                    {
                        name: 'Button',
                        value: 'button',
                        description: 'Send a button message',
                    },
                    {
                        name: 'List',
                        value: 'list',
                        description: 'Send a list message (min 3 options)',
                    },
                ],
                default: 'text',
                required: false,
            },
            {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                default: '',
                placeholder: 'Enter your message',
                description: 'The message content to send',
                required: false,
                typeOptions: {
                    rows: 4,
                },
            },
            {
                displayName: 'Options',
                name: 'options',
                type: 'json',
                displayOptions: {
                    show: {
                        type: ['list', 'button'],
                    },
                },
                default: '[]',
                required: false,
                description: 'Options array in JSON format',
                hint: 'Format: [{"id": "1", "title": "Option 1", "description": "Optional"}]',
            },
            {
                displayName: 'Button Title',
                name: 'buttonTitle',
                type: 'string',
                displayOptions: {
                    show: {
                        type: ['list'],
                    },
                },
                default: 'Choose an option',
                required: false,
                description: 'Title for the list button (max 20 chars)',
            },
        ],
    };

    /**
     * Get parameter with fallback value
     */
    private getParameterSafe<T>(
        func: IExecuteFunctions,
        name: string,
        index: number,
        defaultValue: T
    ): T {
        try {
            const value = func.getNodeParameter(name, index, defaultValue) as T;
            return value || defaultValue;
        } catch {
            return defaultValue;
        }
    }

    /**
     * Extract message parameters from node
     */
    private getMessageParams(func: IExecuteFunctions, index: number): EnreachMessageParams {
        const type = this.getParameterSafe(func, 'type', index, 'text') as EnreachMessageParams['type'];
        let text = this.getParameterSafe(func, 'text', index, '');

        // Ensure we have text
        if (!text) {
            text = 'Message sent via Enreach Tool';
        }

        const params: EnreachMessageParams = { text, type };

        // Handle options for button/list types
        if (type === 'button' || type === 'list') {
            const optionsStr = this.getParameterSafe(func, 'options', index, '[]');
            try {
                params.options = JSON.parse(optionsStr);
            } catch {
                params.options = [];
            }

            if (type === 'list') {
                params.buttonTitle = this.getParameterSafe(func, 'buttonTitle', index, 'Choose');
            }
        }

        return params;
    }

    /**
     * Try to get credentials from workflow data proxy
     */
    private async getCredentialsFromWorkflow(
        func: IExecuteFunctions,
        index: number
    ): Promise<Partial<EnreachCredentials>> {
        try {
            const workflowData = func.getWorkflowDataProxy(index);
            const triggerNodes = ['Enreach Trigger', 'Enreach Trigger1', 'EnreachTrigger'];

            for (const nodeName of triggerNodes) {
                try {
                    const nodeOutput = workflowData.$node[nodeName];
                    if (nodeOutput?.json?.jwt && nodeOutput?.json?.callbackUrl) {
                        return {
                            jwt: nodeOutput.json.jwt as string,
                            callbackUrl: nodeOutput.json.callbackUrl as string,
                        };
                    }
                } catch {
                    // Continue to next node
                }
            }
        } catch {
            // Workflow data not accessible
        }
        return {};
    }

    /**
     * Try to get credentials from input data
     */
    private getCredentialsFromInput(inputData: IDataObject): Partial<EnreachCredentials> {
        const creds: Partial<EnreachCredentials> = {};

        // Direct check
        if (inputData.jwt) creds.jwt = inputData.jwt as string;
        if (inputData.callbackUrl) creds.callbackUrl = inputData.callbackUrl as string;

        // Check nested structures if needed
        if (!creds.jwt || !creds.callbackUrl) {
            const contexts = ['$parent', '$context', '$input'];
            for (const contextKey of contexts) {
                const context = inputData[contextKey];
                if (typeof context === 'object' && context !== null) {
                    const ctx = context as IDataObject;
                    if (!creds.jwt && ctx.jwt) creds.jwt = ctx.jwt as string;
                    if (!creds.callbackUrl && ctx.callbackUrl) creds.callbackUrl = ctx.callbackUrl as string;
                    if (creds.jwt && creds.callbackUrl) break;
                }
            }
        }

        return creds;
    }

    /**
     * Try to get credentials using expression evaluation
     */
    private async getCredentialsFromExpression(
        func: IExecuteFunctions,
        index: number
    ): Promise<Partial<EnreachCredentials>> {
        const creds: Partial<EnreachCredentials> = {};

        try {
            creds.jwt = func.evaluateExpression('{{ $("Enreach Trigger1").item.json.jwt }}', index) as string;
            creds.callbackUrl = func.evaluateExpression('{{ $("Enreach Trigger1").item.json.callbackUrl }}', index) as string;
        } catch {
            // Expressions couldn't be evaluated
        }

        return creds;
    }

    /**
     * Retrieve Enreach credentials from multiple sources
     */
    private async getEnreachCredentials(
        func: IExecuteFunctions,
        items: INodeExecutionData[],
        index: number
    ): Promise<EnreachCredentials | null> {
        let jwt = '';
        let callbackUrl = '';

        // Method 1: From workflow proxy
        const workflowCreds = await this.getCredentialsFromWorkflow(func, index);
        jwt = workflowCreds.jwt || '';
        callbackUrl = workflowCreds.callbackUrl || '';

        // Method 2: From input data
        if (!jwt || !callbackUrl) {
            const inputCreds = this.getCredentialsFromInput(items[index].json);
            jwt = jwt || inputCreds.jwt || '';
            callbackUrl = callbackUrl || inputCreds.callbackUrl || '';
        }

        // Method 3: From all input items
        if (!jwt || !callbackUrl) {
            for (const item of items) {
                if (item.json?.jwt && !jwt) jwt = item.json.jwt as string;
                if (item.json?.callbackUrl && !callbackUrl) callbackUrl = item.json.callbackUrl as string;
                if (jwt && callbackUrl) break;
            }
        }

        // Method 4: From expressions
        if (!jwt || !callbackUrl) {
            const exprCreds = await this.getCredentialsFromExpression(func, index);
            jwt = jwt || exprCreds.jwt || '';
            callbackUrl = callbackUrl || exprCreds.callbackUrl || '';
        }

        // Return null if we don't have both
        if (!jwt || !callbackUrl) {
            return null;
        }

        return { jwt, callbackUrl };
    }

    /**
     * Build request body for Enreach API
     */
    private buildRequestBody(params: EnreachMessageParams, jwt: string): EnreachRequestBody {
        const body: EnreachRequestBody = {
            type: params.type,
            jwt,
            text: params.text,
        };

        if (params.options && params.options.length > 0) {
            body.options = params.options;
        }

        if (params.type === 'list' && params.buttonTitle) {
            body.buttonTitle = params.buttonTitle;
        }

        return body;
    }

    /**
     * Send message via Enreach API
     */
    private async sendMessage(
        func: IExecuteFunctions,
        callbackUrl: string,
        body: EnreachRequestBody
    ): Promise<IDataObject> {
        return await func.helpers.httpRequest({
            method: 'POST' as IHttpRequestMethods,
            url: callbackUrl,
            body,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const instance = new EnreachTool();

        for (let i = 0; i < items.length; i++) {
            try {
                // Get message parameters
                const params = instance.getMessageParams(this, i);

                // Get credentials
                const credentials = await instance.getEnreachCredentials(this, items, i);

                if (!credentials) {
                    // No credentials found
                    returnData.push({
                        json: {
                            success: false,
                            error: 'MISSING_CREDENTIALS',
                            message: 'JWT or callback URL not found. Ensure Enreach Trigger has been executed.',
                            messagePrepared: params.text,
                            messageType: params.type,
                        },
                        pairedItem: { item: i },
                    });
                    continue;
                }

                // Build and send request
                const requestBody = instance.buildRequestBody(params, credentials.jwt);
                const response = await instance.sendMessage(this, credentials.callbackUrl, requestBody);

                // Success response
                returnData.push({
                    json: {
                        success: true,
                        messageSent: params.text,
                        messageType: params.type,
                        response,
                    },
                    pairedItem: { item: i },
                });

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            success: false,
                            error: 'EXECUTION_ERROR',
                            errorMessage,
                        },
                        pairedItem: { item: i },
                    });
                } else {
                    throw new NodeOperationError(
                        this.getNode(),
                        errorMessage,
                        { itemIndex: i }
                    );
                }
            }
        }

        return [returnData];
    }
}