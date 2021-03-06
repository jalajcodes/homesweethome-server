import { Booking, Listing, ListingType } from '../../../libs/types';

export interface ListingArgs {
	id: string;
}

export interface ListingBookingsArgs {
	limit: number;
	page: number;
}

export interface ListingBookingsData {
	total: number;
	result: Booking[];
}

export interface HostListingInput {
	id?: string;
	title: string;
	description: string;
	image: string;
	type: ListingType;
	address: string;
	price: number;
	numOfGuests: number;
}

export interface HostListingArgs {
	input: HostListingInput;
}

export interface DeleteListingInput {
	id: string;
}

export interface DeleteListingArgs {
	input: DeleteListingInput;
}

export enum ListingsFilter {
	PRICE_HIGH_TO_LOW = 'PRICE_HIGH_TO_LOW',
	PRICE_LOW_TO_HIGH = 'PRICE_LOW_TO_HIGH',
	NUM_OF_GUESTS_1 = 'NUM_OF_GUESTS_1',
	NUM_OF_GUESTS_2 = 'NUM_OF_GUESTS_2',
	NUM_OF_GUESTS_GT_2 = 'NUM_OF_GUESTS_GT_2',
}

export interface ListingsArgs {
	filter?: ListingsFilter;
	limit: number;
	page: number;
	location: string | null;
}

export interface ListingsData {
	region: string | null;
	total: number;
	result: Listing[];
}

export interface ListingsQuery {
	country?: string;
	city?: string;
	admin?: string;
	numOfGuests?: Record<string, unknown> | number;
}
