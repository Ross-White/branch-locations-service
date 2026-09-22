import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { BranchLocation } from "./types";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

export class db {
  private tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async get(locationId: string): Promise<BranchLocation | null> {
    const result = await ddb.send(
        new GetCommand({
            TableName: this.tableName,
            Key: { LocationId: locationId },
        })
    )
    return result.Item as BranchLocation | null;
  }

  async put(location: BranchLocation): Promise<void> {
    await ddb.send(
        new PutCommand({
            TableName: this.tableName,
            Item: location,
        })
    );
  }

  async list(): Promise<BranchLocation[]> {
    const result = await ddb.send(
        new ScanCommand({
            TableName: this.tableName,
        })
    );
    return result.Items as BranchLocation[];
  }
}