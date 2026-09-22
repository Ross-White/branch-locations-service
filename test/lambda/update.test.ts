import { APIGatewayProxyEvent } from 'aws-lambda';
import { dynamoDb } from '@shared/db';
import { getCoordinates } from '@shared/coordinates';
import { BranchLocation, Coordinates } from '@shared/types';

jest.mock('@shared/db');
jest.mock('@shared/coordinates');

import { handler } from '../../lambdas/update';

const MockedDynamoDb = dynamoDb as jest.MockedClass<typeof dynamoDb>;

const mockedGet = MockedDynamoDb.prototype.get as jest.MockedFunction<
    InstanceType<typeof dynamoDb>['get']
>;
const mockedPut = MockedDynamoDb.prototype.put as jest.MockedFunction<
    InstanceType<typeof dynamoDb>['put']
>;
const mockedGetCoordinates = getCoordinates as jest.MockedFunction<typeof getCoordinates>;

function buildEvent(id: string | undefined, body: unknown): APIGatewayProxyEvent {
    return {
        pathParameters: id === undefined ? null : { id },
        body: body === undefined ? null : JSON.stringify(body),
    } as unknown as APIGatewayProxyEvent;
}

const validId = '1234567';

const existingLocation: BranchLocation = {
    locationId: '1234567',
    name: 'Dallas Branch',
    city: 'Dallas',
    state: 'Texas',
    country: 'USA',
    latitude: 32.7762719,
    longitude: -96.7968559,
};

const updateBody = {
    name: 'Dallas Branch (Updated)',
    city: 'Fort Worth',
    state: 'Texas',
    country: 'USA',
};

const newCoordinates: Coordinates = {
    latitude: 32.7554883,
    longitude: -97.3307658,
};

describe('update handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('updates the location and returns 200 for a valid request', async () => {
        mockedGet.mockResolvedValue(existingLocation);
        mockedGetCoordinates.mockResolvedValue(newCoordinates);

        const result = await handler(buildEvent(validId, updateBody));

        const expectedLocation: BranchLocation = {
            locationId: existingLocation.locationId,
            name: updateBody.name,
            city: updateBody.city,
            state: updateBody.state,
            country: updateBody.country,
            latitude: newCoordinates.latitude,
            longitude: newCoordinates.longitude,
        };

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(expectedLocation);

        expect(mockedGet).toHaveBeenCalledWith(validId);
        expect(mockedGetCoordinates).toHaveBeenCalledWith(updateBody.city, updateBody.state, updateBody.country);
        expect(mockedPut).toHaveBeenCalledTimes(1);
        expect(mockedPut).toHaveBeenCalledWith(expectedLocation);
    });

    it.each([
        ['missing', undefined],
        ['too short', '12345'],
        ['too long', '1234567890123'],
    ])('returns 400 when the locationId is invalid', async (_description, id) => {
        const result = await handler(buildEvent(id, updateBody));

        expect(result.statusCode).toBe(400);
        const parsed = JSON.parse(result.body);
        expect(parsed.message).toBe('Invalid location id');

        expect(mockedGet).not.toHaveBeenCalled();
        expect(mockedGetCoordinates).not.toHaveBeenCalled();
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('returns 400 when the request body fails validation', async () => {
        const invalidBody = { name: 'Dallas Branch', city: 'Dallas', state: 'Texas' };

        const result = await handler(buildEvent(validId, invalidBody));

        expect(result.statusCode).toBe(400);
        const parsed = JSON.parse(result.body);
        expect(parsed.message).toBe('Invalid request body');
        expect(parsed.errors).toBeDefined();

        expect(mockedGet).not.toHaveBeenCalled();
        expect(mockedGetCoordinates).not.toHaveBeenCalled();
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('returns 400 when a field in the body exceeds the allowed length', async () => {
        const invalidBody = { ...updateBody, name: 'a'.repeat(51) };

        const result = await handler(buildEvent(validId, invalidBody));

        expect(result.statusCode).toBe(400);
        expect(mockedGet).not.toHaveBeenCalled();
    });

    it('returns 400 when no request body is provided', async () => {
        const result = await handler(buildEvent(validId, undefined));

        expect(result.statusCode).toBe(400);
        expect(mockedGet).not.toHaveBeenCalled();
    });

    it('returns 404 when no location exists for the given locationId', async () => {
        mockedGet.mockResolvedValue(null);

        const result = await handler(buildEvent(validId, updateBody));

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body)).toEqual({ message: `Location not found for id: ${validId}` });

        expect(mockedGetCoordinates).not.toHaveBeenCalled();
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('returns 500 when the database lookup throws', async () => {
        mockedGet.mockRejectedValue(new Error('ddb unavailable'));

        const result = await handler(buildEvent(validId, updateBody));

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({ message: 'Error occurred while fetching location' });
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('returns 500 when fetching coordinates throws', async () => {
        mockedGet.mockResolvedValue(existingLocation);
        mockedGetCoordinates.mockRejectedValue(new Error('network failure'));

        const result = await handler(buildEvent(validId, updateBody));

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({ message: 'Error occurred while fetching coordinates' });
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('returns 400 when no coordinates can be resolved for the updated location', async () => {
        mockedGet.mockResolvedValue(existingLocation);
        mockedGetCoordinates.mockResolvedValue(null);

        const result = await handler(buildEvent(validId, updateBody));

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toEqual({
            message: 'Could not resolve coordinates for the given location',
        });
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('propagates an error when the database write fails', async () => {
        mockedGet.mockResolvedValue(existingLocation);
        mockedGetCoordinates.mockResolvedValue(newCoordinates);
        mockedPut.mockRejectedValue(new Error('ddb unavailable'));

        await expect(handler(buildEvent(validId, updateBody))).rejects.toThrow('ddb unavailable');
    });

    it('rejects when the request body is not valid JSON', async () => {
        const event = {
            pathParameters: { id: validId },
            body: '{not valid json',
        } as unknown as APIGatewayProxyEvent;

        await expect(handler(event)).rejects.toThrow();
        expect(mockedGet).not.toHaveBeenCalled();
    });
});
