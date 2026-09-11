/* eslint-env node */
// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// The gallery lives in a pnpm workspace: watch the repo root and resolve
// modules from both the app and the root store.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// This file is near-identical across apps/admin, apps/vendor and
// apps/traveler (same monorepo boilerplate), and Metro's default global
// cache (%TEMP%/metro-cache) keys partly off config content rather than the
// full project path. Two sibling Expo apps with the same config can collide
// there and one serves the other's bundle. A distinct cacheVersion per app
// is Metro's documented way out of exactly this.
config.cacheVersion = 'dahab-traveler-1';

module.exports = withNativeWind(config, { input: './global.css' });
