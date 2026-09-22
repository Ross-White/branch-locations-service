import { dynamoDb } from "@shared/db";
import { validateLocationId, formatValidationErrors } from "@shared/validation";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const db = new dynamoDb();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const validationResult = validateLocationId(event.pathParameters?.id);

    if (!validationResult.success) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid location id", errors: formatValidationErrors(validationResult.error) }),
        };
    }

    const id = validationResult.data;

    let location;
    try {
        location = await db.get(id);
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error occurred while fetching location" }),
        };
    }

    if (!location) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: `Location not found for id: ${id}` }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(location),
    };
}
