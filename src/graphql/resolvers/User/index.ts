import { IResolvers } from 'apollo-server-express';

export const UserResolvers: IResolvers = {
	Query: {
		user: () => 'query.user',
	},
};
