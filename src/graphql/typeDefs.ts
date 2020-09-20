import { gql } from 'apollo-server-express';

export const typeDefs = gql`
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

	input HostListingInput {
		id: String
		title: String!
		description: String!
		image: String!
		type: ListingType!
		address: String!
		price: Int!
		numOfGuests: Int!
	}

	input DeleteListingInput {
		id: String!
	}

	input CreateBookingInput {
		id: ID!
		source: String!
		checkIn: String!
		checkOut: String!
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
		hostListing(input: HostListingInput!): Listing!
		deleteListing(input: DeleteListingInput!): Listing!
		createBooking(input: CreateBookingInput!): Booking!
	}
`;
