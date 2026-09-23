import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDb } from '@shared/db';
import { BranchLocation } from '@shared/types';

const ddbMock = mockClient(DynamoDBDocumentClient);

const location: BranchLocation = {
    locationId: '1234567',
    name: 'Dallas Branch',
    city: 'Dallas',
    state: 'Texas',
    country: 'USA',
    latitude: 32.7762719,
    longitude: -96.7968559,
};

describe('dynamoDb', () => {
    let db: dynamoDb;

    beforeEach(() => {
        ddbMock.reset();
        db = new dynamoDb();
    });

    describe('put', () => {
        it('stores the location as-is, keyed by locationId', async () => {
            ddbMock.on(PutCommand).resolves({});

            await db.put(location);

            expect(ddbMock.commandCalls(PutCommand)[0].args[0].input.Item).toEqual(location);
        });
    });

    describe('get', () => {
        it('reads by the locationId key', async () => {
            ddbMock.on(GetCommand).resolves({ Item: location });

            const result = await db.get(location.locationId);

            expect(ddbMock.commandCalls(GetCommand)[0].args[0].input.Key).toEqual({
                locationId: location.locationId,
            });
            expect(result).toEqual(location);
        });

        it('returns null when no item exists', async () => {
            ddbMock.on(GetCommand).resolves({});

            const result = await db.get('9999999');

            expect(result).toBeNull();
        });
    });

    describe('list', () => {
        it('returns every scanned item', async () => {
            ddbMock.on(ScanCommand).resolves({ Items: [location] });

            const result = await db.list();

            expect(result).toEqual([location]);
        });

        it('returns an empty array when the table has no items', async () => {
            ddbMock.on(ScanCommand).resolves({});

            const result = await db.list();

            expect(result).toEqual([]);
        });
    });
});
