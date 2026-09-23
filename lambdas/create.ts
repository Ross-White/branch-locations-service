import { BranchLocation, Coordinates, CreateLocationInput } from "@shared/types";
import { getCoordinates } from "@shared/coordinates";
import { dynamoDb } from "@shared/db";
import { validateCreateLocationInput, formatValidationErrors } from "@shared/validation";

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const db = new dynamoDb();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const body: CreateLocationInput | null = event.body ? JSON.parse(event.body) : null;
    const validationResult = validateCreateLocationInput(body);

    if (!validationResult.success) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid request body", errors: formatValidationErrors(validationResult.error) }),
        };
    }

    const { locationId, name, city, state, country } = validationResult.data;

    let existingLocation: BranchLocation | null;
    try {
        existingLocation = await db.get(locationId);
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error occurred while checking for an existing location" }),
        };
    }

    if (existingLocation) {
        return {
            statusCode: 409,
            body: JSON.stringify({ message: `A location already exists with id: ${locationId}` }),
        };
    }

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

    const { latitude, longitude } = coordinates;

    const location: BranchLocation = {
        locationId: locationId,
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