import dotenv from 'dotenv';
dotenv.config();

import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './graphql/index';
import { connectDatabase } from './database';

const app = express();

const mount = async (app: Application) => {
	// Connect to database
	const db = await connectDatabase();

	// Use Cookie Parser Middleware
	app.use(cookieParser(process.env.COOKIE_SECRET));

	// Instantiate apollo server instance
	const server = new ApolloServer({ typeDefs, resolvers, context: ({ req, res }) => ({ db, req, res }) });
	// Use the middleware provided by apollo
	server.applyMiddleware({ app, path: '/api' });

	app.listen(process.env.PORT, () =>
		console.log(`Server running on ${'http://localhost:' + process.env.PORT + server.graphqlPath}`)
	);
};

mount(app);
