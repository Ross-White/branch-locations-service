export interface BranchLocation {
  locationId: string;
  name: string;
  city: string;
  state: string;
	country: string;
  latitude: number;
  longitude: number;
}

export interface LocationInput {
	name: string;
	city: string;
	state: string;
	country: string;
}

export interface CreateLocationInput extends LocationInput {
	locationId: string;
}

export interface Coordinates {
	latitude: number;
	longitude: number;
}