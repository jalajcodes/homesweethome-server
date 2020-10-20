import { IResolvers } from 'apollo-server-express';
import crypto from 'crypto';
import { Viewer, User, Database } from '../../../libs/types';
import { Google, Stripe } from '../../../libs/api';
import { authorize } from '../../../libs/utils';

import { LogInArgs, StripeConnectArgs } from './types';
import { Response, Request } from 'express';

const cookieOptions = {
	httpOnly: true,
	signed: true,
	sameSite: 'none',
	secure: process.env.NODE_ENV === 'development' ? false : true,
	// domain: 'netlify.app',
} as const;

const cookieExpiry = process.env.COOKIE_EXPIRY
	? parseInt(process.env.COOKIE_EXPIRY) * 24 * 60 * 60 * 1000
	: 30 * 24 * 60 * 60 * 1000;

const loginViaGoogle = async (code: string, token: string, db: Database, res: Response): Promise<User | undefined> => {
	const { user } = await Google.login(code);
	if (!user) {
		throw new Error('Google Login Error');
	}

	// Names/Photos/Emails List from google
	const userNamesList = user.names && user.names.length ? user.names : null;
	const userPhotosList = user.photos && user.photos.length ? user.photos : null;
	const userEmailsList = user.emailAddresses && user.emailAddresses.length ? user.emailAddresses : null;

	// User Display Name
	const userName = userNamesList ? userNamesList[0].displayName : null;

	// User Id
	const userId =
		userNamesList && userNamesList[0].metadata && userNamesList[0].metadata.source
			? userNamesList[0].metadata.source.id
			: null;

	// User Avatar
	const userAvatar = userPhotosList && userPhotosList[0].url ? userPhotosList[0].url : null;

	// User Email
	const userEmail = userEmailsList && userEmailsList[0].value ? userEmailsList[0].value : null;

	// Check above variables are not null
	if (!userId || !userName || !userAvatar || !userEmail) {
		throw new Error('Google login error');
	}

	// Finally, check if user already exists then update their data
	const updateResult = await db.users.findOneAndUpdate(
		{ _id: userId },
		{
			$set: {
				name: userName,
				avatar: userAvatar,
				contact: userEmail,
				token,
			},
		},
		{ returnOriginal: false }
	);

	let viewer = updateResult.value; // (updateResult.value return the updated user details)

	// But if user don't exist, create one.
	if (!viewer) {
		const insertResult = await db.users.insertOne({
			_id: userId,
			token,
			name: userName,
			avatar: userAvatar,
			contact: userEmail,
			income: 0,
			bookings: [],
			listings: [],
		});

		viewer = insertResult.ops[0]; //(insertResult.ops[0] returns user details)
	}

	// Set the cookie
	res.cookie('viewer', userId, {
		...cookieOptions,
		maxAge: cookieExpiry,
	});

	return viewer;
};

const loginViaCookie = async (token: string, db: Database, req: Request, res: Response): Promise<User | undefined> => {
	const updateRes = await db.users.findOneAndUpdate(
		{ _id: req.signedCookies.viewer },
		{ $set: { token } },
		{ returnOriginal: false }
	);

	const viewer = updateRes.value;

	if (!viewer) {
		res.clearCookie('viewer', cookieOptions);
	}

	return viewer;
};

export const ViewerResolver: IResolvers = {
	Query: {
		authUrl: (): string => {
			try {
				return Google.authUrl;
			} catch (error) {
				throw new Error(`Failed to query Google Auth Url : ${error}`);
			}
		},
	},
	Mutation: {
		login: async (
			_root: undefined,
			{ input }: LogInArgs,
			{ db, res, req }: { db: Database; req: Request; res: Response }
		): Promise<Viewer> => {
			try {
				const code = input ? input.code : null;
				const token = crypto.randomBytes(16).toString('hex');

				// if the code variable is passed in from the client then we know that we want to
				// fetch the user details from google and if code var isn't passed then we know that
				// user has logged in before and they have a cookie saved in the browser, so we'll log'em in
				// via cookie.
				const viewer: User | undefined = code
					? await loginViaGoogle(code, token, db, res)
					: await loginViaCookie(token, db, req, res);

				if (!viewer) {
					return { didRequest: true };
				}

				return {
					_id: viewer._id,
					token: viewer.token,
					avatar: viewer.avatar,
					walletId: viewer.walletId,
					didRequest: true,
				};
			} catch (err) {
				throw new Error(`Unable to login: ${err}`);
			}
		},
		logout: (_root: undefined, _args: undefined, { res }): Viewer => {
			try {
				res.clearCookie('viewer', cookieOptions);
				return { didRequest: true };
			} catch (error) {
				throw new Error(`Failed to log out: ${error}`);
			}
		},

		loginAsGuest: async (
			_root: undefined,
			_args: undefined,
			{ db, res }: { db: Database; res: Response }
		): Promise<Viewer> => {
			try {
				const userId = '5d378db94e84753160e08b55'; // test user id
				const viewer = await db.users.findOne({
					_id: userId,
				});

				if (!viewer) {
					return { didRequest: true };
				}

				res.cookie('viewer', userId, {
					...cookieOptions,
					maxAge: cookieExpiry,
				});

				return {
					_id: viewer._id,
					token: viewer.token,
					avatar: viewer.avatar,
					walletId: viewer.walletId,
					didRequest: true,
				};
			} catch (error) {
				throw new Error(`Unable to login as guest: ${error}`);
			}
		},

		stripeConnect: async (
			_root: undefined,
			{ input }: StripeConnectArgs,
			{ db, req }: { db: Database; req: Request }
		) => {
			try {
				const { code } = input;
				// get the logged in user info
				let viewer = await authorize(req, db);

				if (!viewer) {
					throw new Error(`Viewer can't be found`);
				}

				// connect to stripe
				const stripeInfo = await Stripe.connect(code);
				if (!stripeInfo) {
					throw new Error(`Stripe grant error`);
				}
				// get walletId from the response
				const walletId = stripeInfo.stripe_user_id;

				// update users walletId
				const updateUser = await db.users.findOneAndUpdate(
					{ _id: viewer._id },
					{ $set: { walletId } },
					{ returnOriginal: false }
				);

				if (!updateUser.value) {
					throw new Error(`Unable to update the viewer`);
				}
				// set the viewer variable to updated user value
				viewer = updateUser.value;

				return {
					id: viewer._id,
					token: viewer.token,
					avatar: viewer.avatar,
					walletId: viewer.walletId,
					didRequest: true,
				};
			} catch (error) {
				throw new Error(`Unable to connect to stripe: ${error}`);
			}
		},
		stripeDisconnect: async (_root: undefined, _args: undefined, { db, req }: { db: Database; req: Request }) => {
			try {
				let viewer = await authorize(req, db);
				if (!viewer) {
					throw new Error('viewer cannot be found');
				}

				const updateRes = await db.users.findOneAndUpdate(
					{ _id: viewer._id },
					{ $set: { walletId: undefined } },
					{ returnOriginal: false }
				);

				if (!updateRes.value) {
					throw new Error('viewer could not be updated');
				}

				viewer = updateRes.value;

				return {
					_id: viewer._id,
					token: viewer.token,
					avatar: viewer.avatar,
					walletId: viewer.walletId,
					didRequest: true,
				};
			} catch (error) {
				throw new Error(`Failed to disconnect with Stripe: ${error}`);
			}
		},
	},
	Viewer: {
		id: (viewer: Viewer): string | undefined => {
			return viewer._id;
		},
		hasWallet: (viewer: Viewer): boolean | undefined => {
			return viewer.walletId ? true : undefined;
		},
	},
};
