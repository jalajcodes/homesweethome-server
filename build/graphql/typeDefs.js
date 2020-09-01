"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeDefs = void 0;
const apollo_server_express_1 = require("apollo-server-express");
exports.typeDefs = apollo_server_express_1.gql `
	type Booking {
		id: ID!
		listing: Listing!
		tenant: User!
		checkIn: String!
		checkOut: String!
	}

	type Bookings {
		total: Int!
		result: [Booking!]!
	}

	enum ListingType {
		APARTMENT
		HOUSE
	}

	type Listing {
		id: ID!
		title: String!
		description: String!
		image: String!
		host: User!
		type: ListingType!
		address: String!
		city: String!
		country: String!
		admin: String!
		bookings(limit: Int!, page: Int!): Bookings
		bookingsIndex: String!
		price: Int!
		numOfGuests: Int!
	}

	type Listings {
		region: String
		total: Int!
		result: [Listing!]!
	}

	enum ListingsFilter {
		PRICE_HIGH_TO_LOW
		PRICE_LOW_TO_HIGH
		NUM_OF_GUESTS_1
		NUM_OF_GUESTS_2
		NUM_OF_GUESTS_GT_2
	}

	type User {
		id: ID!
		name: String!
		avatar: String!
		contact: String!
		hasWallet: Boolean!
		income: Int
		bookings(limit: Int!, page: Int!): Bookings
		listings(limit: Int!, page: Int!): Listings!
	}

	type Viewer {
		id: ID
		token: String
		avatar: String
		hasWallet: Boolean
		didRequest: Boolean!
	}

	input LogInInput {
		code: String!
	}

	input StripeConnectInput {
		code: String!
	}

	type Query {
		authUrl: String!
		user(id: ID!): User!
		listing(id: ID!): Listing!
		listings(location: String, filter: ListingsFilter, limit: Int!, page: Int!): Listings!
	}

	type Mutation {
		login(input: LogInInput): Viewer!
		loginAsGuest: Viewer!
		logout: Viewer!
		stripeConnect(input: StripeConnectInput!): Viewer!
		stripeDisconnect: Viewer!
	}
`;
