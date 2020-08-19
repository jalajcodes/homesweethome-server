import { Booking } from '../../../libs/types';

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
