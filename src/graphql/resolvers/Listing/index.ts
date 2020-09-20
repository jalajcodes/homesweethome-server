import { IResolvers } from 'apollo-server-express';
import { Listing, Database, User, ListingType } from '../../../libs/types';
import {
	ListingArgs,
	ListingsArgs,
	ListingBookingsArgs,
	ListingBookingsData,
	ListingsData,
	ListingsFilter,
	ListingsQuery,
	HostListingArgs,
	HostListingInput,
	DeleteListingArgs,
} from './types';
import { ObjectId } from 'mongodb';
import { authorize, geocode } from '../../../libs/utils';
import { Request } from 'express';
import { Cloudinary } from '../../../libs/api';

const verifyHostListingInputs = (input: HostListingInput) => {
	const { title, description, price, type } = input;

	if (title.length > 100) {
		throw new Error('listing title must be under 100 characters');
	}
	if (description.length > 5000) {
		throw new Error('listing description must be under 5000 characters');
	}
	if (type !== ListingType.Apartment && type !== ListingType.House) {
		throw new Error('listing type must be either an apartment or house');
	}
	if (price < 0) {
		throw new Error('price must be greater than 0');
	}
};

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

				// Check for numOfGuests filter
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
	Mutation: {
		hostListing: async (
			_root: undefined,
			{ input }: HostListingArgs,
			{ db, req }: { db: Database; req: Request }
		): Promise<Listing> => {
			// verify the inputs
			verifyHostListingInputs(input);

			// make sure the user is logged in
			const viewer = await authorize(req, db);
			if (!viewer) {
				throw new Error(`You must be logged in to create or edit a Listing.`);
			}
			// remove the street info from the recived address (because api doesn't work with streets)
			const addrArray = input.address.split(',');
			addrArray.shift();
			const tempAdr = addrArray.join(',');
			// get the country admin and city from the geocoder
			const { admin, city, country } = await geocode(tempAdr);

			if (!country || !admin || !city) {
				throw new Error(`Invalid Address Input Provided.`);
			}

			let imageUrl = input.image;
			// only upload if the image is updated ( means when the image is in base64 format)
			if (input.image.split(':')[0] === 'data') {
				imageUrl = await Cloudinary.upload(input.image);
			}

			// update data if listing already exists
			const updateResult = await db.listings.findOneAndUpdate(
				{ _id: new ObjectId(input.id) },
				{
					$set: {
						_id: new ObjectId(input.id),
						...input,
						image: imageUrl,
						country,
						admin,
						city,
					},
				},
				{ returnOriginal: false }
			);

			let listing = updateResult.value;

			// if listing doesn't exist already, create the listing
			if (!listing) {
				const createListingResult = await db.listings.insertOne({
					_id: new ObjectId(),
					...input,
					image: imageUrl,
					bookings: [],
					bookingsIndex: {},
					country,
					admin,
					city,
					host: viewer._id,
				});

				listing = createListingResult.ops[0];
			}

			// add the created listing id into the listing field of respected user
			const createdlistingId = listing._id;
			await db.users.updateOne({ _id: viewer._id }, { $push: { listings: createdlistingId } });

			// return the listing result
			return listing;
		},

		deleteListing: async (
			_root: undefined,
			{ input }: DeleteListingArgs,
			{ db, req }: { db: Database; req: Request }
		): Promise<Listing> => {
			const viewer = await authorize(req, db);
			if (!viewer) {
				throw new Error(`You must be logged in to delete a Listing.`);
			}

			const deleteListingResult = await db.listings.findOneAndDelete({
				_id: new ObjectId(input.id),
			});

			if (!deleteListingResult.value) {
				throw new Error('No Listing found to be deleted');
			}

			return deleteListingResult.value;
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
