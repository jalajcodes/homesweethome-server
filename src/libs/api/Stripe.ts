import stripe from 'stripe';

const client = new stripe(`${process.env.S_SECRET_KEY}`, { apiVersion: '2020-08-27' });
// this
export const Stripe = {
	connect: async (code: string) => {
		const response = await client.oauth.token({
			code,
			grant_type: 'authorization_code',
		});

		return response;
	},

	charge: async (amount: number, source: string, stripeAccount: string) => {
		const res = await client.charges.create(
			{
				amount,
				currency: 'inr',
				source,
				application_fee_amount: Math.floor(amount * 0.05),
				description: 'HomeSweetHome Ltd.',
			},
			{
				stripeAccount: stripeAccount,
			}
		);

		if (res.status !== 'succeeded') {
			throw new Error(`failed to create charge with stripe`);
		}
	},
};
