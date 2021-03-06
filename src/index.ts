// import dotenv from 'dotenv';
// dotenv.config();

import express, { Application } from 'express';
import cookieParser from 'cookie-parser';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs, resolvers } from './graphql/index';
import { connectDatabase } from './database';

const app = express();
const mount = async (app: Application) => {
	// Connect to database
	const db = await connectDatabase();

	app.use(cookieParser(process.env.COOKIE_SECRET));

	// Instantiate apollo server instance
	const server = new ApolloServer({
		typeDefs,
		resolvers,
		context: ({ req, res }) => ({ db, req, res }),
		playground: true, // these last two options enables graphiql in production
		introspection: true,
	});

	// Use the middleware provided by apollo
	server.applyMiddleware({
		app,
		path: '/api',
		cors: {
			credentials: true,
			origin: process.env.NODE_ENV === 'development' ? '' : 'https://homesweethomee.netlify.app',
		},
		bodyParserConfig: {
			limit: '2mb',
		},
	});

	app.listen(process.env.PORT, () =>
		console.log(
			`Server running in ${process.env.NODE_ENV} on ${
				'http://localhost:' + process.env.PORT + server.graphqlPath
			}`
		)
	);
};

mount(app);
