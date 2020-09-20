import { IResolvers } from 'apollo-server-express';
import { Booking, Database, Listing, BookingsIndex, User } from '../../../libs/types';
import { Request } from 'express';
import { CreateBookingArgs } from './types';
import { authorize } from '../../../libs/utils';
import { ObjectId } from 'mongodb';
import { Stripe } from '../../../libs/api/Stripe';

const resolveBookingsIndex = (bookingsIndex: BookingsIndex, checkInDate: string, checkOutDate: string) => {
	let dateCursor = new Date(checkInDate);
	const checkOut = new Date(checkOutDate);
	const newBookingsIndex = { ...bookingsIndex };

	while (dateCursor <= checkOut) {
		const y = dateCursor.getUTCFullYear();
		const m = dateCursor.getUTCMonth();
		const d = dateCursor.getUTCDate();

		if (!newBookingsIndex[y]) {
			newBookingsIndex[y] = {};
		}

		if (!newBookingsIndex[y][m]) {
			newBookingsIndex[y][m] = {};
		}

		if (!newBookingsIndex[y][m][d]) {
			newBookingsIndex[y][m][d] = true;
		} else {
			throw new Error("selected dates can't overlap dates that have already been booked");
		}

		dateCursor = new Date(dateCursor.getTime() + 86400000);
	}
	return newBookingsIndex;
};

export const BookingResolvers: IResolvers = {
	Mutation: {
		createBooking: async (
			_root: undefined,
			{ input }: CreateBookingArgs,
			{ db, req }: { db: Database; req: Request }
		): Promise<Booking> => {
			try {
				const { id, source, checkIn, checkOut } = input;

				// verify a logged in user is making a request
				const viewer = await authorize(req, db);
				if (!viewer) {
					throw new Error('You must be logged in to create a booking.');
				}
				// find listing document foe which the booking is to be made
				const listing = await db.listings.findOne({ _id: new ObjectId(id) });
				if (!listing) {
					throw new Error('Unable to query listing');
				}
				// check that viewer is not booking their own listing
				if (listing.host === viewer._id) {
					throw new Error('You cannot book your own listing.');
				}
				// check that checkOut is not before checkIn
				const checkInDate = new Date(checkIn);
				const checkOutDate = new Date(checkOut);

				if (checkOutDate < checkInDate) {
					throw new Error("Checkin date can't be after checkout date");
				}
				// create a new BookingsIndex for the listing being booked
				const bookingsIndex = resolveBookingsIndex(listing.bookingsIndex, checkIn, checkOut);

				// get total price to charge
				const priceToCharege = listing.price * ((checkOutDate.getTime() - checkInDate.getTime()) / 86400000 + 1);
				// get user document of the host of the listing
				const listingHost = await db.users.findOne({ _id: listing.host });
				if (!listingHost || !listingHost.walletId) {
					throw new Error("the host either can't be found or is not connected with stripe");
				}
				// create stripe charge on behalf of the host
				await Stripe.charge(priceToCharege, source, listingHost.walletId);
				// insert a new booking document into the bookings collection
				const insertResult = await db.bookings.insertOne({
					_id: new ObjectId(),
					listing: listing._id,
					tenant: viewer._id,
					checkIn,
					checkOut,
				});

				const insertedBooking: Booking = insertResult.ops[0];
				// update user document of the host to increment income
				await db.users.updateOne(
					{ _id: listingHost._id },
					{
						$inc: { income: priceToCharege },
					}
				);
				// update bookings field of the tenant (user who is making booking)
				await db.users.updateOne(
					{ _id: viewer._id },
					{
						$push: { bookings: insertedBooking._id },
					}
				);
				// update bookings field of the listing document
				await db.listings.updateOne(
					{ _id: listing._id },
					{
						$set: { bookingsIndex },
						$push: { bookings: insertedBooking._id },
					}
				);
				// return newly inserted booking
				return insertedBooking;
			} catch (error) {
				throw new Error(`Unable to create booking: ${error}`);
			}
		},
	},
	Booking: {
		id: (booking: Booking): string => {
			return booking._id.toHexString();
		},
		listing: (booking: Booking, _args: undefined, { db }: { db: Database }): Promise<Listing | null> => {
			return db.listings.findOne({ _id: booking.listing });
		},
		tenant: (booking: Booking, _args: undefined, { db }: { db: Database }): Promise<User | null> => {
			return db.users.findOne({ _id: booking.tenant });
		},
	},
};
