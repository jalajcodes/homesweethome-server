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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const apollo_server_express_1 = require("apollo-server-express");
const index_1 = require("./graphql/index");
const database_1 = require("./database");
const app = express_1.default();
const mount = (app) => __awaiter(void 0, void 0, void 0, function* () {
    // Connect to database
    const db = yield database_1.connectDatabase();
    // Use Cookie Parser Middleware
    app.use(cookie_parser_1.default(process.env.COOKIE_SECRET));
    // Instantiate apollo server instance
    const server = new apollo_server_express_1.ApolloServer({ typeDefs: index_1.typeDefs, resolvers: index_1.resolvers, context: ({ req, res }) => ({ db, req, res }) });
    // Use the middleware provided by apollo
    server.applyMiddleware({ app, path: '/api' });
    app.listen(process.env.PORT, () => console.log(`Server running on ${'http://localhost:' + process.env.PORT + server.graphqlPath}`));
});
mount(app);
