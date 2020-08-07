import { MongoClient } from 'mongodb';
import { Database, Booking, User, Listing } from '../libs/types';

const uri = `${process.env.DB_URI}`;
export const connectDatabase = async (): Promise<Database> => {
	const client = await MongoClient.connect(uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});

	const db = client.db('tslisting');

	return {
		bookings: db.collection<Booking>('bookings'),
		listings: db.collection<Listing>('listings'),
		users: db.collection<User>('users'),
	};
};
