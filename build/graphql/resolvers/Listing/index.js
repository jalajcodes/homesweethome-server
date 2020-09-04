"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingResolvers = void 0;
const types_1 = require("./types");
const mongodb_1 = require("mongodb");
const utils_1 = require("../../../libs/utils");
exports.ListingResolvers = {
    Query: {
        listing: (_root, { id }, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const listing = yield db.listings.findOne({ _id: new mongodb_1.ObjectId(id) });
                if (!listing) {
                    throw new Error("listing can't be found");
                }
                const viewer = yield utils_1.authorize(req, db);
                if (viewer && viewer._id === listing.host) {
                    listing.authorized = true;
                }
                return listing;
            }
            catch (error) {
                throw new Error(`Unable to query listing: ${error}`);
            }
        }),
        listings: (_root, { filter, limit, page, location }, { db }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const data = {
                    region: null,
                    total: 0,
                    result: [],
                };
                const query = {};
                if (location) {
                    const { city, country, admin } = yield utils_1.geocode(location);
                    if (city)
                        query.city = city;
                    if (admin)
                        query.admin = admin;
                    if (country) {
                        query.country = country;
                    }
                    else {
                        throw new Error(`No Country Found`);
                    }
                    // set the region
                    const region = `${city ? city + ',' : ''} ${admin ? admin + ',' : ''} ${country}`;
                    data.region = region.trim();
                }
                // Check for numOfGuests filter
                if (filter && filter === types_1.ListingsFilter.NUM_OF_GUESTS_1) {
                    query.numOfGuests = 1;
                }
                if (filter && filter === types_1.ListingsFilter.NUM_OF_GUESTS_2) {
                    query.numOfGuests = 2;
                }
                if (filter && filter === types_1.ListingsFilter.NUM_OF_GUESTS_GT_2) {
                    query.numOfGuests = { $gt: 2 };
                }
                // get the data from db
                let cursor = yield db.listings.find(query);
                // Check for price filters
                // 1 refers to Ascending
                // -1 refers to Descending
                if (filter && filter === types_1.ListingsFilter.PRICE_HIGH_TO_LOW) {
                    cursor = cursor.sort({ price: -1 });
                }
                if (filter && filter === types_1.ListingsFilter.PRICE_LOW_TO_HIGH) {
                    cursor = cursor.sort({ price: 1 });
                }
                cursor = cursor.skip(page > 0 ? (page - 1) * limit : 0);
                cursor = cursor.limit(limit);
                data.total = yield cursor.count();
                data.result = yield cursor.toArray();
                return data;
            }
            catch (error) {
                throw new Error(`Failed to query user listings: ${error}`);
            }
        }),
    },
    Listing: {
        id: (listing) => {
            return listing._id.toHexString();
        },
        host: (listing, _args, { db }) => __awaiter(void 0, void 0, void 0, function* () {
            const host = yield db.users.findOne({ _id: listing.host });
            if (!host) {
                throw new Error("host can't be found");
            }
            return host;
        }),
        bookingsIndex: (listing) => {
            return JSON.stringify(listing.bookingsIndex);
        },
        bookings: (listing, { limit, page }, { db }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                if (!listing.authorized) {
                    return null;
                }
                const data = {
                    total: 0,
                    result: [],
                };
                let cursor = yield db.bookings.find({
                    _id: { $in: listing.bookings },
                });
                cursor = cursor.skip(page > 0 ? (page - 1) * limit : 0);
                cursor = cursor.limit(limit);
                data.total = yield cursor.count();
                data.result = yield cursor.toArray();
                return data;
            }
            catch (error) {
                throw new Error(`Failed to query user bookings: ${error}`);
            }
        }),
    },
};
