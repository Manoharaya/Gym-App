const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'packages/validation/src/index.ts',
  'packages/utils/src/index.ts',
  'packages/ui/src/index.ts',
  'packages/types/src/tenant.ts',
  'packages/types/src/index.ts',
  'packages/types/src/entities.ts',
  'packages/constants/src/index.ts',
  'packages/config/src/index.ts',
  'packages/api-client/src/index.ts',
  'packages/api-client/src/client.ts',
];

filesToUpdate.forEach((relPath) => {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/\.js'/g, "'");
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated: ${relPath}`);
  }
});

const tsconfigs = [
  'packages/types/tsconfig.json',
  'packages/constants/tsconfig.json',
  'packages/config/tsconfig.json',
  'packages/validation/tsconfig.json',
  'packages/api-client/tsconfig.json',
  'packages/ui/tsconfig.json',
  'packages/utils/tsconfig.json',
];

tsconfigs.forEach((relPath) => {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (fs.existsSync(fullPath)) {
    const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    config.compilerOptions.module = 'ES2022';
    config.compilerOptions.moduleResolution = 'bundler';
    fs.writeFileSync(fullPath, JSON.stringify(config, null, 2), 'utf8');
    console.log(`Updated tsconfig: ${relPath}`);
  }
});
