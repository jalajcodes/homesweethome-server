import { ObjectID, Collection } from 'mongodb';

export interface Listing {
	_id: ObjectID;
	title: string;
	image: string;
	address: string;
	price: number;
	numOfGuests: number;
	numOfBeds: number;
	numOfBaths: number;
	rating: number;
}

export interface User {
	_id: ObjectID;
}
export interface Bookings {
	_id: ObjectID;
}

export interface Database {
	listings: Collection<Listing>;
	user: Collection<User>;
	bookings: Collection<Bookings>;
}
