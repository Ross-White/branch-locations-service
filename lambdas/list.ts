import { dynamoDb } from "@shared/db";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const db = new dynamoDb();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    let locations;
    try {
        locations = await db.list();
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error occurred while fetching locations" }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(locations),
    };
}
