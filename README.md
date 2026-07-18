# @lumine-code/less-cache

Caches compiled Less stylesheets and invalidates them when source files or imports change.

## Features

- **Synchronous compilation**: exposes the synchronous API required by Lumine's theme loader.
- **Import-aware invalidation**: recompiles when a source file or any imported file changes.
- **Portable caches**: supports resource-relative paths and fallback cache directories.
- **Cross-platform behavior**: normalizes cache paths across Windows, macOS, and Linux.

## Installation

```sh
npm install @lumine-code/less-cache
```

## Usage

```js
const LessCache = require('@lumine-code/less-cache')

const cache = new LessCache({
  cacheDir: '/tmp/less-cache',
  importPaths: ['/path/to/theme/styles']
})

const css = cache.readFileSync('/path/to/theme/index.less')
```

The constructor accepts the following options:

- `cacheDir`: directory used for compiled cache entries.
- `importPaths`: directories searched for Less imports.
- `resourcePath`: base directory used to create portable relative cache paths.
- `fallbackDir`: secondary readable cache directory.
- `syncCaches`: synchronizes entries between the primary and fallback caches.
- `lessSourcesByRelativeFilePath`: in-memory Less sources keyed by relative path.
- `importedFilePathsByRelativeImportPath`: precomputed import file lists keyed by relative import path.

## Building

```sh
npm install
npm test
```

## Changes

This is the Lumine fork of `less-cache`, published under the `@lumine-code` scope. Relative to the upstream Pulsar package it:

- Rebrands and modernizes the package as `@lumine-code/less-cache` and releases it as a new major version.
- Converts the test suite to JavaScript.
- Prepares token-free npm publishing.
- Updates the license attribution for Lumine.

## Contributing

Bug reports and contributions are welcome on GitHub.
