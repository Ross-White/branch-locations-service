import { APIGatewayProxyEvent } from 'aws-lambda';
import { dynamoDb } from '@shared/db';
import { BranchLocation } from '@shared/types';

jest.mock('@shared/db');

import { handler } from '../../lambdas/get';

const MockedDynamoDb = dynamoDb as jest.MockedClass<typeof dynamoDb>;

const mockedGet = MockedDynamoDb.prototype.get as jest.MockedFunction<
    InstanceType<typeof dynamoDb>['get']
>;

function buildEvent(locationId?: string): APIGatewayProxyEvent {
    return {
        pathParameters: locationId === undefined ? null : { locationId },
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

describe('get handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 200 with the location when it exists', async () => {
        mockedGet.mockResolvedValue(existingLocation);

        const result = await handler(buildEvent(validId));

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(existingLocation);
        expect(mockedGet).toHaveBeenCalledWith(validId);
        expect(mockedGet).toHaveBeenCalledTimes(1);
    });

    it('returns 404 when no location exists for the given id', async () => {
        mockedGet.mockResolvedValue(null);

        const result = await handler(buildEvent('9999999'));

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body)).toEqual({ message: 'Location not found for id: 9999999' });
    });

    it('returns 400 when no id path parameter is provided', async () => {
        const result = await handler(buildEvent(undefined));

        expect(result.statusCode).toBe(400);
        const parsed = JSON.parse(result.body);
        expect(parsed.message).toBe('Invalid location id');
        expect(parsed.errors).toBeDefined();

        expect(mockedGet).not.toHaveBeenCalled();
    });

    it('returns 400 when the id path parameter is an empty string', async () => {
        const result = await handler(buildEvent(''));

        expect(result.statusCode).toBe(400);
        expect(mockedGet).not.toHaveBeenCalled();
    });

    it.each([
        ['too short', '12345'],
        ['too long', '1234567890123'],
    ])('returns 400 when the id is invalid', async (_description, id) => {
        const result = await handler(buildEvent(id));

        expect(result.statusCode).toBe(400);
        const parsed = JSON.parse(result.body);
        expect(parsed.message).toBe('Invalid location id');
        expect(mockedGet).not.toHaveBeenCalled();
    });

    it('returns 500 when the database lookup throws', async () => {
        mockedGet.mockRejectedValue(new Error('ddb unavailable'));

        const result = await handler(buildEvent(validId));

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({ message: 'Error occurred while fetching location' });
    });
});
