export interface BranchLocation {
  locationId: number;
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

export interface Coordinates {
	latitude: number;
	longitude: number;
	id: number;
}