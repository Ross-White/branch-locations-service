export interface BranchLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
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
}