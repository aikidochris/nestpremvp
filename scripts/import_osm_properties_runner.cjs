// CommonJS runner that executes the TypeScript importer using ts-node
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
  },
});
require('./import_osm_properties.ts');
