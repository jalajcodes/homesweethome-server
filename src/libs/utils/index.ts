import { Database, User } from '../types';
import { Request } from 'express';

export const authorize = async (req: Request, db: Database): Promise<User | null> => {
	const token = req.get('X-CSRF-TOKEN');
	const viewer = await db.users.findOne({
		_id: req.signedCookies.viewer,
		token,
	});

	return viewer;
};
