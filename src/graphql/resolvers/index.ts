import merge from 'lodash.merge';
import { ViewerResolver } from './Viewer';
import { UserResolvers } from './User';

export const resolvers = merge(ViewerResolver, UserResolvers);
