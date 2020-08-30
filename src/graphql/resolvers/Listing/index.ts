import { IResolvers } from 'apollo-server-express';
import { Listing, Database, User } from '../../../libs/types';
import {
	ListingArgs,
	ListingsArgs,
	ListingBookingsArgs,
	ListingBookingsData,
	ListingsData,
	ListingsFilter,
	ListingsQuery,
} from './types';
import { ObjectId } from 'mongodb';
import { authorize, geocode } from '../../../libs/utils';
import { Request } from 'express';

export const ListingResolvers: IResolvers = {
	Query: {
		listing: async (
			_root: undefined,
			{ id }: ListingArgs,
			{ db, req }: { db: Database; req: Request }
		): Promise<Listing> => {
			try {
				const listing = await db.listings.findOne({ _id: new ObjectId(id) });
				if (!listing) {
					throw new Error("listing can't be found");
				}

				const viewer = await authorize(req, db);

				if (viewer && viewer._id === listing.host) {
					listing.authorized = true;
				}

				return listing;
			} catch (error) {
				throw new Error(`Unable to query listing: ${error}`);
			}
		},
		listings: async (
			_root: undefined,
			{ filter, limit, page, location }: ListingsArgs,
			{ db }: { db: Database }
		): Promise<ListingsData> => {
			try {
				const data: ListingsData = {
					region: null,
					total: 0,
					result: [],
				};

				const query: ListingsQuery = {};
				if (location) {
					const { city, country, admin } = await geocode(location);
					if (city) query.city = city;
					if (admin) query.admin = admin;
					if (country) {
						query.country = country;
					} else {
						throw new Error(`No Country Found`);
					}

					// set the region
					const region = `${city ? city + ',' : ''} ${admin ? admin + ',' : ''} ${country}`;
					data.region = region.trim();
				}

				// Check for numOfGuests filtere
				if (filter && filter === ListingsFilter.NUM_OF_GUESTS_1) {
					query.numOfGuests = 1;
				}
				if (filter && filter === ListingsFilter.NUM_OF_GUESTS_2) {
					query.numOfGuests = 2;
				}
				if (filter && filter === ListingsFilter.NUM_OF_GUESTS_GT_2) {
					query.numOfGuests = { $gt: 2 };
				}

				// get the data from db
				let cursor = await db.listings.find(query);

				// Check for price filters
				// 1 refers to Ascending
				// -1 refers to Descending
				if (filter && filter === ListingsFilter.PRICE_HIGH_TO_LOW) {
					cursor = cursor.sort({ price: -1 });
				}

				if (filter && filter === ListingsFilter.PRICE_LOW_TO_HIGH) {
					cursor = cursor.sort({ price: 1 });
				}

				cursor = cursor.skip(page > 0 ? (page - 1) * limit : 0);
				cursor = cursor.limit(limit);

				data.total = await cursor.count();
				data.result = await cursor.toArray();

				return data;
			} catch (error) {
				throw new Error(`Failed to query user listings: ${error}`);
			}
		},
	},

	Listing: {
		id: (listing: Listing): string => {
			return listing._id.toHexString();
		},
		host: async (listing: Listing, _args: undefined, { db }: { db: Database }): Promise<User> => {
			const host = await db.users.findOne({ _id: listing.host });
			if (!host) {
				throw new Error("host can't be found");
			}
			return host;
		},
		bookingsIndex: (listing: Listing): string => {
			return JSON.stringify(listing.bookingsIndex);
		},
		bookings: async (
			listing: Listing,
			{ limit, page }: ListingBookingsArgs,
			{ db }: { db: Database }
		): Promise<ListingBookingsData | null> => {
			try {
				if (!listing.authorized) {
					return null;
				}

				const data: ListingBookingsData = {
					total: 0,
					result: [],
				};

				let cursor = await db.bookings.find({
					_id: { $in: listing.bookings },
				});

				cursor = cursor.skip(page > 0 ? (page - 1) * limit : 0);
				cursor = cursor.limit(limit);

				data.total = await cursor.count();
				data.result = await cursor.toArray();

				return data;
			} catch (error) {
				throw new Error(`Failed to query user bookings: ${error}`);
			}
		},
	},
};
