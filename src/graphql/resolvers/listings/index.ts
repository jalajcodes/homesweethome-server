import { IResolvers } from 'apollo-server-express';
import { Database, Listing } from '../../../libs/types';
import { ObjectID } from 'mongodb';

export const listingsResolver: IResolvers = {
	Query: {
		listings: async (
			_root: undefined,
			_args: Record<string, unknown>,
			{ db }: { db: Database }
		): Promise<Listing[]> => {
			return await db.listings.find({}).toArray();
		},
	},

	Mutation: {
		deleteListing: async (_root: undefined, { id }: { id: string }, { db }: { db: Database }): Promise<Listing> => {
			const deletedLising = await db.listings.findOneAndDelete({
				_id: new ObjectID(id),
			});

			if (!deletedLising.value) throw new Error('Failed to delete listing.');

			return deletedLising.value;
		},
	},
	Listing: {
		id: (listing: Listing) => listing._id,
	},
};
