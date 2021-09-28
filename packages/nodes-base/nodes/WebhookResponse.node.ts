import {
	BINARY_ENCODING,
} from 'n8n-core';

import {
	IExecuteFunctions,
	IN8nHttpFullResponse,
	IN8nHttpResponse,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class WebhookResponse implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webhook Response',
		icon: 'file:webhook.svg',
		name: 'webhookResponse',
		group: ['transform'],
		version: 1,
		description: 'Returns data for Webhook',
		defaults: {
			name: 'Webhook Response',
			color: '#885577',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
		],
		properties: [
			{
				displayName: 'Response Data',
				name: 'responseData',
				type: 'options',
				options: [
					{
						name: 'JSON',
						value: 'json',
						description: 'Return JSON data',
					},
					{
						name: 'Binary',
						value: 'binary',
						description: 'Return binary data',
					},
				],
				// TODO: Add string option?
				default: 'json',
				description: 'If binary or JSON data should be returned.',
			},
			{
				displayName: 'Response Body',
				name: 'responseBody',
				type: 'json',
				displayOptions: {
					show: {
						responseData: [
							'json',
						],
					},
				},
				default: '',
				description: 'The HTTP Response data',
			},
			{
				displayName: 'Property Name',
				name: 'responseBinaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						responseData: [
							'binary',
						],
					},
				},
				description: 'Name of the binary property to return',
			},
			{
				displayName: 'Response Headers',
				name: 'responseHeaders',
				type: 'json',
				default: '',
				description: 'The HTTP Response headers',
			},
			{
				displayName: 'Response Code',
				name: 'responseCode',
				type: 'number',
				typeOptions: {
					minValue: 100,
					maxValue: 599,
				},
				default: 200,
				description: 'The HTTP Response code to return',
			},
		],
	};

	execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const responseCode = this.getNodeParameter('responseCode', 0) as number;
		const responseHeaders = this.getNodeParameter('responseHeaders', 0) as string;
		const responseData = this.getNodeParameter('responseData', 0) as string;

		// TODO: Check if it works with empty, should also allow setting one key at a time
		let headers = JSON.parse(responseHeaders);

		let responseBody: IN8nHttpResponse;
		if (responseData === 'json') {
			responseBody = JSON.parse(this.getNodeParameter('responseBody', 0) as string);
		} else if (responseData === 'binary') {
			const item = this.getInputData()[0];

			if (item.binary === undefined) {
				throw new NodeOperationError(this.getNode(), 'No binary data exists on the first item!');
			}

			const responseBinaryPropertyName = this.getNodeParameter('responseBinaryPropertyName', 0) as string;

			const binaryData = item.binary[responseBinaryPropertyName];

			if (binaryData === undefined) {
				throw new NodeOperationError(this.getNode(), `No binary data property "${responseBinaryPropertyName}" does not exists on item!`);
			}

			headers['content-type'] = binaryData.mimeType;
			responseBody = Buffer.from(binaryData.data, BINARY_ENCODING);
		} else {
			throw new NodeOperationError(this.getNode(), `The Response Data option "${responseData}" is not supported!`);
		}

		const response: IN8nHttpFullResponse = {
			body: responseBody,
			headers,
			statusCode: responseCode,
			// TODO: Check why statusMessage is required, does not make sense
			statusMessage: 'blub',
		};

		this.sendWebhookResponse(response);

		return this.prepareOutputData(items);
	}

}