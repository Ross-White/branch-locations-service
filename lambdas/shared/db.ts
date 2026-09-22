import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { BranchLocation } from "./types";



export class dynamoDb {
    private client: DynamoDBClient;
    private tableName: string;
    private ddb: DynamoDBDocumentClient;

  constructor() {
    this.tableName = process.env.TABLE_NAME || 'BranchLocations';
    this.client = new DynamoDBClient({});
    this.ddb = DynamoDBDocumentClient.from(this.client);
  }

  async get(locationId: string): Promise<BranchLocation | null> {
    const result = await this.ddb.send(
        new GetCommand({
            TableName: this.tableName,
            Key: { LocationId: locationId },
        })
    )
    return result.Item as BranchLocation | null;
  }

  async put(location: BranchLocation): Promise<void> {
    await this.ddb.send(
        new PutCommand({
            TableName: this.tableName,
            Item: location,
        })
    );
  }

  async list(): Promise<BranchLocation[]> {
    const result = await this.ddb.send(
        new ScanCommand({
            TableName: this.tableName,
        })
    );
    return result.Items as BranchLocation[];
  }
}