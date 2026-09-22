import { APIGatewayProxyEvent } from 'aws-lambda';
import { getCoordinates } from '@shared/coordinates';
import { dynamoDb } from '@shared/db';
import { Coordinates, LocationInput } from '@shared/types';

jest.mock('@shared/coordinates');
jest.mock('@shared/db');

import { handler } from '../../lambdas/create';

const mockedGetCoordinates = getCoordinates as jest.MockedFunction<typeof getCoordinates>;
const MockedDynamoDb = dynamoDb as jest.MockedClass<typeof dynamoDb>;

const mockedPut = MockedDynamoDb.mock.instances[0].put as jest.MockedFunction<
    InstanceType<typeof dynamoDb>['put']
>;

function buildEvent(body: unknown): APIGatewayProxyEvent {
    return {
        body: body === undefined ? null : JSON.stringify(body),
    } as unknown as APIGatewayProxyEvent;
}

const validBody: LocationInput = {
    name: 'Dallas Branch',
    city: 'Dallas',
    state: 'Texas',
    country: 'USA',
};

const validCoordinates: Coordinates = {
    latitude: 32.7762719,
    longitude: -96.7968559,
    id: 123456,
};

describe('create handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('creates a location and returns 201 for a valid request', async () => {
        mockedGetCoordinates.mockResolvedValue(validCoordinates);

        const result = await handler(buildEvent(validBody));

        expect(result.statusCode).toBe(201);
        const expectedLocation = {
            id: validCoordinates.id,
            name: validBody.name,
            city: validBody.city,
            state: validBody.state,
            country: validBody.country,
            latitude: validCoordinates.latitude,
            longitude: validCoordinates.longitude,
        };
        expect(JSON.parse(result.body)).toEqual(expectedLocation);

        expect(mockedGetCoordinates).toHaveBeenCalledWith(validBody.city, validBody.state, validBody.country);
        expect(mockedPut).toHaveBeenCalledTimes(1);
        expect(mockedPut).toHaveBeenCalledWith(expectedLocation);
    });

    it('returns 400 and does not call coordinates/db when the body fails validation', async () => {
        const invalidBody = { name: 'Dallas Branch', city: 'Dallas', state: 'Texas' };

        const result = await handler(buildEvent(invalidBody));

        expect(result.statusCode).toBe(400);
        const parsed = JSON.parse(result.body);
        expect(parsed.message).toBe('Invalid request body');
        expect(parsed.errors).toBeDefined();

        expect(mockedGetCoordinates).not.toHaveBeenCalled();
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('returns 400 when a field exceeds the allowed length', async () => {
        const invalidBody = { ...validBody, name: 'a'.repeat(51) };

        const result = await handler(buildEvent(invalidBody));

        expect(result.statusCode).toBe(400);
        expect(mockedGetCoordinates).not.toHaveBeenCalled();
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('returns 400 when no request body is provided', async () => {
        const result = await handler(buildEvent(undefined));

        expect(result.statusCode).toBe(400);
        const parsed = JSON.parse(result.body);
        expect(parsed.message).toBe('Invalid request body');

        expect(mockedGetCoordinates).not.toHaveBeenCalled();
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('returns 500 when fetching coordinates throws', async () => {
        mockedGetCoordinates.mockRejectedValue(new Error('network failure'));

        const result = await handler(buildEvent(validBody));

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({ message: 'Error occurred while fetching coordinates' });
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('returns 400 when no coordinates can be resolved for the location', async () => {
        mockedGetCoordinates.mockResolvedValue(null);

        const result = await handler(buildEvent(validBody));

        expect(result.statusCode).toBe(400);
        expect(JSON.parse(result.body)).toEqual({
            message: 'Could not resolve coordinates for the given location',
        });
        expect(mockedPut).not.toHaveBeenCalled();
    });

    it('propagates an error when the database write fails', async () => {
        mockedGetCoordinates.mockResolvedValue(validCoordinates);
        mockedPut.mockRejectedValue(new Error('ddb unavailable'));

        await expect(handler(buildEvent(validBody))).rejects.toThrow('ddb unavailable');
    });

    it('rejects when the request body is not valid JSON', async () => {
        const event = { body: '{not valid json' } as unknown as APIGatewayProxyEvent;

        await expect(handler(event)).rejects.toThrow();
        expect(mockedGetCoordinates).not.toHaveBeenCalled();
    });
});
