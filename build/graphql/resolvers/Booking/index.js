"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingResolvers = void 0;
exports.BookingResolvers = {
    Booking: {
        id: (booking) => {
            return booking._id.toHexString();
        },
        listing: (booking, _args, { db }) => {
            return db.listings.findOne({ _id: booking.listing });
        },
    },
};
