import { APIGatewayProxyEvent } from 'aws-lambda';
import { dynamoDb } from '@shared/db';
import { BranchLocation } from '@shared/types';

jest.mock('@shared/db');

import { handler } from '../../lambdas/list';

const MockedDynamoDb = dynamoDb as jest.MockedClass<typeof dynamoDb>;

const mockedList = MockedDynamoDb.prototype.list as jest.MockedFunction<
    InstanceType<typeof dynamoDb>['list']
>;

function buildEvent(): APIGatewayProxyEvent {
    return {} as unknown as APIGatewayProxyEvent;
}

const locations: BranchLocation[] = [
    {
        locationId: '1234567',
        name: 'Dallas Branch',
        city: 'Dallas',
        state: 'Texas',
        country: 'USA',
        latitude: 32.7762719,
        longitude: -96.7968559,
    },
    {
        locationId: '7654321',
        name: 'Fort Worth Branch',
        city: 'Fort Worth',
        state: 'Texas',
        country: 'USA',
        latitude: 32.7554883,
        longitude: -97.3307658,
    },
];

describe('list handler', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns 200 with all locations', async () => {
        mockedList.mockResolvedValue(locations);

        const result = await handler(buildEvent());

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual(locations);
        expect(mockedList).toHaveBeenCalledWith();
        expect(mockedList).toHaveBeenCalledTimes(1);
    });

    it('returns 200 with an empty array when there are no locations', async () => {
        mockedList.mockResolvedValue([]);

        const result = await handler(buildEvent());

        expect(result.statusCode).toBe(200);
        expect(JSON.parse(result.body)).toEqual([]);
    });

    it('returns 500 when the database scan throws', async () => {
        mockedList.mockRejectedValue(new Error('ddb unavailable'));

        const result = await handler(buildEvent());

        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body)).toEqual({ message: 'Error occurred while fetching locations' });
    });
});
