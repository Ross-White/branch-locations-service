import { BranchLocation, Coordinates, LocationInput } from "@shared/types";
import { getCoordinates } from "@shared/coordinates";
import { dynamoDb } from "@shared/db";
import { validateLocationId, validateLocationInput, formatValidationErrors } from "@shared/validation";

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const db = new dynamoDb();

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const idValidationResult = validateLocationId(event.pathParameters?.locationId);

    if (!idValidationResult.success) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid location id", errors: formatValidationErrors(idValidationResult.error) }),
        };
    }

    const id = idValidationResult.data;

    const body: LocationInput | null = event.body ? JSON.parse(event.body) : null;
    const bodyValidationResult = validateLocationInput(body);

    if (!bodyValidationResult.success) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: "Invalid request body", errors: formatValidationErrors(bodyValidationResult.error) }),
        };
    }

    const { name, city, state, country } = bodyValidationResult.data;

    let existingLocation: BranchLocation | null;
    try {
        existingLocation = await db.get(id);
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error occurred while fetching location" }),
        };
    }

    if (!existingLocation) {
        return {
            statusCode: 404,
            body: JSON.stringify({ message: `Location not found for id: ${id}` }),
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
        locationId: existingLocation.locationId,
        name: name,
        city: city,
        state: state,
        country: country,
        latitude: latitude,
        longitude: longitude
    };

    await db.put(location);

    return {
        statusCode: 200,
        body: JSON.stringify(location),
    };
}
