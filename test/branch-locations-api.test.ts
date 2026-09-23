import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as BranchLocationsApi from '../lib/branch-locations-api-stack';

describe('BranchLocationsApiStack', () => {
	const app = new cdk.App();
	const stack = new BranchLocationsApi.BranchLocationsApiStack(app, 'BranchLocationsApiStack');
	const template = Template.fromStack(stack);

  it('should create a DynamoDB table with locationId as the partition key', () => {
		template.hasResourceProperties('AWS::DynamoDB::Table', {
			"KeySchema": [{ "AttributeName": "locationId", "KeyType": "HASH" }],
			"BillingMode": "PAY_PER_REQUEST",
		});
	});

  it('should create four Lambda functions with the shared runtime, timeout, and TABLE_NAME environment variable', () => {
    const functions = Object.values(template.findResources('AWS::Lambda::Function'));

    expect(functions).toHaveLength(4);
    for (const fn of functions) {
      expect(fn.Properties.Runtime).toBe('nodejs22.x');
      expect(fn.Properties.Timeout).toBe(10);
      expect(fn.Properties.Environment.Variables.TABLE_NAME).toBe('BranchLocations');
    }
  });

  function policyActionsFor(lambdaConstructId: string): string[] {
    const policies = template.findResources('AWS::IAM::Policy');
    const [, policy] = Object.entries(policies).find(([id]) => id.startsWith(lambdaConstructId))!;
    return policy.Properties.PolicyDocument.Statement[0].Action;
  }

  it('grants read-only access to the list and get Lambdas', () => {
    for (const lambdaConstructId of ['ListLocationsLambda', 'GetLocationLambda']) {
      const actions = policyActionsFor(lambdaConstructId);

      expect(actions).toContain('dynamodb:GetItem');
      expect(actions).not.toContain('dynamodb:PutItem');
    }
  });

  it('grants read and write access to the create and update Lambdas', () => {
    for (const lambdaConstructId of ['CreateLocationLambda', 'UpdateLocationLambda']) {
      const actions = policyActionsFor(lambdaConstructId);

      expect(actions).toContain('dynamodb:GetItem');
      expect(actions).toContain('dynamodb:PutItem');
    }
  });

  it('should create a REST API named "Branch Locations Service"', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Branch Locations Service',
    });
  });

  it('should create /locations and /locations/{locationId} resources', () => {
    const resources = Object.values(template.findResources('AWS::ApiGateway::Resource'));
    const pathParts = resources.map((r: any) => r.Properties.PathPart).sort();

    expect(pathParts).toEqual(['locations', '{locationId}']);
  });

  it('should create two GET, one POST, and one PUT method, each proxying to a Lambda', () => {
    template.resourceCountIs('AWS::ApiGateway::Method', 4);
    template.resourcePropertiesCountIs('AWS::ApiGateway::Method', { HttpMethod: 'GET' }, 2);
    template.resourcePropertiesCountIs('AWS::ApiGateway::Method', { HttpMethod: 'POST' }, 1);
    template.resourcePropertiesCountIs('AWS::ApiGateway::Method', { HttpMethod: 'PUT' }, 1);

    template.resourcePropertiesCountIs('AWS::ApiGateway::Method', {
      Integration: { Type: 'AWS_PROXY', IntegrationHttpMethod: 'POST' },
    }, 4);
  });
});
