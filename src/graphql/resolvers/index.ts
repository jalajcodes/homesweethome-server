import merge from 'lodash.merge';
import { ViewerResolver } from './Viewer';
import { UserResolvers } from './User';
import { ListingResolvers } from './Listing';
import { BookingResolvers } from './Booking';

export const resolvers = merge(ViewerResolver, UserResolvers, ListingResolvers, BookingResolvers);
