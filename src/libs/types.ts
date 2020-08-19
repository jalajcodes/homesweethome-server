import { ObjectID, Collection } from 'mongodb';

export interface Viewer {
	_id?: string;
	token?: string;
	avatar?: string;
	walletId?: string;
	didRequest: boolean;
}

export enum ListingType {
	Apartment = 'APARTMENT',
	House = 'HOUSE',
}

export interface BookingsIndexMonth {
	[key: string]: boolean;
}

export interface BookingsIndexYear {
	[key: string]: BookingsIndexMonth;
}

export interface BookingsIndex {
	[key: string]: BookingsIndexYear;
}

export interface Listing {
	_id: ObjectID;
	title: string;
	description: string;
	image: string;
	host: string;
	type: ListingType;
	address: string;
	country: string;
	admin: string;
	city: string;
	bookings: ObjectID[];
	bookingsIndex: BookingsIndex;
	price: number;
	numOfGuests: number;
	authorized?: boolean;
}

export interface User {
	_id: string;
	token: string;
	name: string;
	avatar: string;
	contact: string;
	walletId?: string;
	income: number;
	bookings: ObjectID[];
	listings: ObjectID[];
	authorized?: boolean;
}

export interface Booking {
	_id: ObjectID;
	listing: ObjectID;
	tenant: string;
	checkIn: string;
	checkOut: string;
}

export interface Database {
	listings: Collection<Listing>;
	users: Collection<User>;
	bookings: Collection<Booking>;
}
