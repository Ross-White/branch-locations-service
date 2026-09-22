import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as BranchLocationsApi from '../lib/branch-locations-api-stack';

describe('BranchLocationsApiStack', () => {
	const app = new cdk.App();
	const stack = new BranchLocationsApi.BranchLocationsApiStack(app, 'BranchLocationsApiStack');
	const template = Template.fromStack(stack);

  it('should create a DynamoDB table with LocationId as the partition key', () => {
		template.hasResourceProperties('AWS::DynamoDB::Table', {
			"KeySchema": [{ "AttributeName": "LocationId", "KeyType": "HASH" }],
			"BillingMode": "PAY_PER_REQUEST",
		});
	});
});
