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
exports.ViewerResolver = void 0;
const crypto_1 = __importDefault(require("crypto"));
const api_1 = require("../../../libs/api");
const utils_1 = require("../../../libs/utils");
const cookieOptions = {
    httpOnly: true,
    sameSite: true,
    signed: true,
    secure: process.env.NODE_ENV === 'development' ? false : true,
};
const cookieExpiry = process.env.COOKIE_EXPIRY
    ? parseInt(process.env.COOKIE_EXPIRY) * 24 * 60 * 60 * 1000
    : 30 * 24 * 60 * 60 * 1000;
const loginViaGoogle = (code, token, db, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user } = yield api_1.Google.login(code);
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
    const userId = userNamesList && userNamesList[0].metadata && userNamesList[0].metadata.source
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
    const updateResult = yield db.users.findOneAndUpdate({ _id: userId }, {
        $set: {
            name: userName,
            avatar: userAvatar,
            contact: userEmail,
            token,
        },
    }, { returnOriginal: false });
    let viewer = updateResult.value; // (updateResult.value return the updated user details)
    // But if user don't exist, create one.
    if (!viewer) {
        const insertResult = yield db.users.insertOne({
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
    res.cookie('viewer', userId, Object.assign(Object.assign({}, cookieOptions), { maxAge: cookieExpiry }));
    return viewer;
});
const loginViaCookie = (token, db, req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const updateRes = yield db.users.findOneAndUpdate({ _id: req.signedCookies.viewer }, { $set: { token } }, { returnOriginal: false });
    const viewer = updateRes.value;
    if (!viewer) {
        res.clearCookie('viewer', cookieOptions);
    }
    return viewer;
});
exports.ViewerResolver = {
    Query: {
        authUrl: () => {
            try {
                return api_1.Google.authUrl;
            }
            catch (error) {
                throw new Error(`Failed to query Google Auth Url : ${error}`);
            }
        },
    },
    Mutation: {
        login: (_root, { input }, { db, res, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const code = input ? input.code : null;
                const token = crypto_1.default.randomBytes(16).toString('hex');
                // if the code variable is passed in from the client then we know that we want to
                // fetch the user details from google and if code var isn't passed then we know that
                // user has logged in before and they have a cookie saved in the browser, so we'll log'em in
                // via cookie.
                const viewer = code
                    ? yield loginViaGoogle(code, token, db, res)
                    : yield loginViaCookie(token, db, req, res);
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
            }
            catch (err) {
                throw new Error(`Unable to login: ${err}`);
            }
        }),
        logout: (_root, _args, { res }) => {
            try {
                res.clearCookie('viewer', cookieOptions);
                return { didRequest: true };
            }
            catch (error) {
                throw new Error(`Failed to log out: ${error}`);
            }
        },
        loginAsGuest: (_root, _args, { db, res }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const userId = '5d378db94e84753160e08b55'; // test user id
                const viewer = yield db.users.findOne({
                    _id: userId,
                });
                if (!viewer) {
                    return { didRequest: true };
                }
                res.cookie('viewer', userId, Object.assign(Object.assign({}, cookieOptions), { maxAge: cookieExpiry }));
                return {
                    _id: viewer._id,
                    token: viewer.token,
                    avatar: viewer.avatar,
                    walletId: viewer.walletId,
                    didRequest: true,
                };
            }
            catch (error) {
                throw new Error(`Unable to login as guest: ${error}`);
            }
        }),
        stripeConnect: (_root, { input }, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const { code } = input;
                // get the logged in user info
                let viewer = yield utils_1.authorize(req, db);
                if (!viewer) {
                    throw new Error(`Viewer can't be found`);
                }
                // connect to stripe
                const stripeInfo = yield api_1.Stripe.connect(code);
                if (!stripeInfo) {
                    throw new Error(`Stripe grant error`);
                }
                // get walletId from the response
                const walletId = stripeInfo.stripe_user_id;
                // update users walletId
                const updateUser = yield db.users.findOneAndUpdate({ _id: viewer._id }, { $set: { walletId } }, { returnOriginal: false });
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
            }
            catch (error) {
                throw new Error(`Unable to connect to stripe: ${error}`);
            }
        }),
        stripeDisconnect: (_root, _args, { db, req }) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                let viewer = yield utils_1.authorize(req, db);
                if (!viewer) {
                    throw new Error('viewer cannot be found');
                }
                const updateRes = yield db.users.findOneAndUpdate({ _id: viewer._id }, { $set: { walletId: undefined } }, { returnOriginal: false });
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
            }
            catch (error) {
                throw new Error(`Failed to disconnect with Stripe: ${error}`);
            }
        }),
    },
    Viewer: {
        id: (viewer) => {
            return viewer._id;
        },
        hasWallet: (viewer) => {
            return viewer.walletId ? true : undefined;
        },
    },
};
