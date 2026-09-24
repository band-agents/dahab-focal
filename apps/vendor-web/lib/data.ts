import { cache } from 'react';

import { api, load } from './api';

/**
 * The three reads the frame and most screens both need.
 *
 * Wrapped in React's `cache`, so the layout and the page asking for the
 * operator's profile in the same render is one call to the API, not two. The
 * cache lives for one request and is thrown away with it — a save followed by
 * a redirect always reads fresh.
 */
export const getMe = cache(() => load(() => api.vendor.me.query()));
export const getProfile = cache(() => load(() => api.vendor.profile.query()));
export const getReviews = cache(() => load(() => api.vendor.reviews.query()));
export const getStories = cache(() => load(() => api.vendor.stories.query()));
