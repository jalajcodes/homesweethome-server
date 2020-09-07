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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geocode = exports.authorize = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const node_geocoder_1 = __importDefault(require("node-geocoder"));
exports.authorize = (req, db) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.get('X-CSRF-TOKEN');
    const viewer = yield db.users.findOne({
        _id: req.signedCookies.viewer,
        token,
    });
    return viewer;
});
////////////////////////////////////////
// Node Geocoder Setup
////////////////////////////////////////
const geocoderOptions = {
    provider: 'openstreetmap',
    httpAdapter: 'https',
    // apiKey: process.env.GEOCODER_KEY, // not needed for openstreetmap api
    formatter: null,
    language: 'en',
};
const geocoder = node_geocoder_1.default(geocoderOptions);
const parseAddress = (data) => {
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
exports.geocode = (address) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const res = yield geocoder.geocode(address);
        console.log('geocode -> res', res);
        return parseAddress(res[0]);
    }
    catch (error) {
        throw new Error(`Failed to geocode: ${error}`);
    }
});
