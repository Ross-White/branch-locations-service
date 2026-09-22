import { getCoordinates } from '@shared/coordinates';

describe('getCoordinates', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return coordinates for a valid location', async () => {
        const result = await getCoordinates('Dallas', 'Texas', 'USA');
        expect(result).toEqual({
            latitude: 32.7762719,
            longitude: -96.7968559
        });
    });

    it('should return null for an invalid location', async () => {
        const result = await getCoordinates('InvalidCity', 'InvalidState', 'InvalidCountry');
        expect(result).toBeNull();
    })
})