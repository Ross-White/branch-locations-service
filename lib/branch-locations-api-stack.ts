import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

export class BranchLocationsApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tableName = 'BranchLocations';
    const table = new dynamodb.Table(this, tableName, {
      tableName,
      partitionKey: { name: 'locationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const lambdaProps = {
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: tableName,
      },
    };

    const listLambda = new NodejsFunction(this, 'ListLocationsLambda', {
      entry: 'lambdas/list.ts',
      ...lambdaProps,
    });
    const getLambda = new NodejsFunction(this, 'GetLocationLambda', {
      entry: 'lambdas/get.ts',
      ...lambdaProps,
    });
    const createLambda = new NodejsFunction(this, 'CreateLocationLambda', {
      entry: 'lambdas/create.ts',
      ...lambdaProps,
    });
    const updateLambda = new NodejsFunction(this, 'UpdateLocationLambda', {
      entry: 'lambdas/update.ts',
      ...lambdaProps,
    });

    table.grantReadData(listLambda);
    table.grantReadData(getLambda);
    table.grantReadWriteData(createLambda);
    table.grantReadWriteData(updateLambda);

    const api = new apigateway.RestApi(this, 'BranchLocationsApi', {
      restApiName: 'Branch Locations Service',
      description: 'This service serves branch locations.',
    });

    const locations = api.root.addResource('locations');
    locations.addMethod('GET', new apigateway.LambdaIntegration(listLambda));
    locations.addMethod('POST', new apigateway.LambdaIntegration(createLambda));

    const location = locations.addResource('{locationId}');
    location.addMethod('GET', new apigateway.LambdaIntegration(getLambda));
    location.addMethod('PUT', new apigateway.LambdaIntegration(updateLambda));
  }
}
