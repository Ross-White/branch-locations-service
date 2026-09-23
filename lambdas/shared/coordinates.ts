import { Coordinates } from "./types";

const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';

export async function getCoordinates(city: string, state: string, country: string): Promise<Coordinates | null> {
    const url = new URL(NOMINATIM_API_URL);
    url.searchParams.set('city', city);
    url.searchParams.set('state', state);
    url.searchParams.set('country', country);
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
        headers: {
            'User-Agent': 'BranchLocationsAPI/1.0',
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        console.error(`Error fetching coordinates: ${response.statusText}`);
        return null;
    }

    const data = await response.json();
    if (data.length === 0) {
        console.error(`No coordinates found for location: ${city}, ${state}, ${country}`);
        return null;
    }

    return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
    };
}