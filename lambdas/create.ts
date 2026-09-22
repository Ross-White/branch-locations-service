import { BranchLocation, Coordinates, LocationInput } from "@shared/types";
import { getCoordinates } from "@shared/coordinates";
import { dynamoDb } from "@shared/db";

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import z from "zod";

const locationSchema = z.object({
  name: z.string().max(50),
  city: z.string().max(50),
  state: z.string().max(50),
  country: z.string().max(50),
});

const db = new dynamoDb();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const body: LocationInput | null = event.body ? JSON.parse(event.body) : null;
    const validationResult = locationSchema.safeParse(body);

    if (!validationResult.success) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid request body", errors: z.treeifyError(validationResult.error) }),
        };
    }

    const { name, city, state, country } = validationResult.data;

    let coordinates: Coordinates | null;
    try {
        coordinates = await getCoordinates(city, state, country);
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error occurred while fetching coordinates" }),
        };
    }

    if (!coordinates) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Could not resolve coordinates for the given location" }),
        };
    }

    const { latitude, longitude, id } = coordinates;

    const location: BranchLocation = {
        id: id,
        name: name,
        city: city,
        state: state,
        country: country,
        latitude: latitude,
        longitude: longitude
    };

    await db.put(location);

    return {
        statusCode: 201,
        body: JSON.stringify(location),
    };
}