import dotenv from 'dotenv';
dotenv.config();

import { Database, User } from '../types';
import { Request } from 'express';
import NodeGeocoder, { Options, Entry } from 'node-geocoder';

export const authorize = async (req: Request, db: Database): Promise<User | null> => {
	const token = req.get('X-CSRF-TOKEN');
	const viewer = await db.users.findOne({
		_id: req.signedCookies.viewer,
		token,
	});

	return viewer;
};

////////////////////////////////////////
// Geocoder Setup
////////////////////////////////////////

const geocoderOptions: Options = {
	provider: 'openstreetmap',
	httpAdapter: 'https',
	// apiKey: process.env.GEOCODER_KEY,
	formatter: null,
	language: 'en',
};

const geocoder = NodeGeocoder(geocoderOptions);

const parseAddress = (data: Entry) => {
	let country = data && data.country ? data.country : null;
	const admin = data && data.state ? data.state : null;
	const city = data && data.city ? data.city : null;

	// Improve the seeder or use another api
	// coz api send the full name of the country,
	// but the seeder data doesn't contain full name,
	// !!!!!!this is a lame check for that, just to make it work!!!!!!
	if (country === 'United States of America') {
		country = 'United States';
	}

	return { country, admin, city };
};

export const geocode = async (address: string) => {
	try {
		const res = await geocoder.geocode(address);
		// console.log('geocode -> res', res);
		return parseAddress(res[0]);
	} catch (error) {
		throw new Error(`Failed to geocode: ${error}`);
	}
};
