import dotenv from 'dotenv';
dotenv.config();

import express, { Application } from 'express';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './graphql/index';
import { connectDatabase } from './database';

const app = express();

const mount = async (app: Application) => {
	// Connect to db
	const db = await connectDatabase();
	// Instantiate apollo server instance
	const server = new ApolloServer({ typeDefs, resolvers, context: () => ({ db }) });
	// Use the middleware provided by apollol
	server.applyMiddleware({ app, path: '/api' });

	app.listen(process.env.PORT, () => console.log(`Server running on ${process.env.PORT}`));
};

mount(app);
