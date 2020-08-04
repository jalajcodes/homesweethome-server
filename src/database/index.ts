import { MongoClient } from 'mongodb';
import { Database, Bookings, User, Listing } from '../libs/types';

const uri = `${process.env.DB_URI}`;
export const connectDatabase = async (): Promise<Database> => {
	const client = await MongoClient.connect(uri, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	});

	const db = client.db('tslisting');

	return {
		bookings: db.collection<Bookings>('bookings'),
		listings: db.collection<Listing>('listings'),
		user: db.collection<User>('users'),
	};
};
