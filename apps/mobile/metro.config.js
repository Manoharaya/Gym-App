const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies from the workspace root or project root
config.resolver.disableHierarchicalLookup = false;

// 4. Ensure asset registry resolves in pnpm monorepo
try {
  config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    '@react-native/assets-registry': path.dirname(
      require.resolve('@react-native/assets-registry/package.json', { paths: [projectRoot] })
    ),
  };
} catch (e) {
  // fallback if not yet resolved
}

module.exports = config;
