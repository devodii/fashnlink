const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

/**
 * Monorepo support: watch the whole workspace so changes to
 * packages/shared are picked up. Deliberately NOT setting
 * disableHierarchicalLookup — that flag is for hoisted (Yarn/npm)
 * workspaces; pnpm's per-package node_modules symlink trees need Metro's
 * normal hierarchical (relative-to-file) lookup to find each dependency's
 * own nested deps (e.g. react-native-web's own fbjs).
 */
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.unstable_enablePackageExports = true;

module.exports = withNativeWind(config, { input: './src/global.css' });
