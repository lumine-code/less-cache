var LessCache, dirname, fs, join, tmpdir;

fs = require('fs');

({dirname, join} = require('path'));

({tmpdir} = require('os'));

LessCache = require('../src/less-cache');

describe("LessCache", function() {
  var cache, fixturesDir, tempDir;
  [cache, fixturesDir, tempDir] = [];
  beforeEach(function() {
    var cacheConfig;
    tempDir = fs.mkdtempSync(join(tmpdir(), 'less-cache-'));
    fixturesDir = join(tempDir, 'fixtures');
    fs.cpSync(join(__dirname, 'fixtures'), fixturesDir, {
      recursive: true
    });
    cacheConfig = {
      importPaths: [join(fixturesDir, 'imports-1'), join(fixturesDir, 'imports-2')],
      cacheDir: join(tempDir, 'cache')
    };
    return cache = new LessCache(cacheConfig);
  });
  afterEach(function() {
    return fs.rmSync(tempDir, {
      recursive: true,
      force: true
    });
  });
  describe("::cssForFile(filePath)", function() {
    var fileLess, filePath;
    filePath = null;
    fileLess = `@import "a";
@import "b";
@import "c";
@import "d";

body {
  a: @a;
  b: @b;
  c: @c;
  d: @d;
}`;
    beforeEach(function() {
      return filePath = join(fixturesDir, 'imports.less');
    });
    it("returns the compiled CSS for a given path and Less content", function() {
      var css;
      css = cache.cssForFile(filePath, fileLess);
      return expect(css).toBe(`body {
  a: 1;
  b: 2;
  c: 3;
  d: 4;
}
`);
    });
    return it("tolerates inline JavaScript", function() {
      var css, lessWithJs;
      filePath = join(fixturesDir, 'with-js.less');
      lessWithJs = `.p(@foo) {
  @value: ~\`@{foo} + 'px'\`;
  div {
    padding: @value;
  }
}

.p(10);`;
      css = cache.cssForFile(filePath, lessWithJs);
      return expect(css).toBe(`div {
  padding: 10px;
}
`);
    });
  });
  describe("::readFileSync(filePath)", function() {
    var css;
    [css] = [];
    beforeEach(function() {
      css = cache.readFileSync(join(fixturesDir, 'imports.less'));
      expect(cache.stats.hits).toBe(0);
      return expect(cache.stats.misses).toBe(1);
    });
    it("returns the compiled CSS for a given Less file path", function() {
      return expect(css).toBe(`body {
  a: 1;
  b: 2;
  c: 3;
  d: 4;
}
`);
    });
    it("returns the cached CSS for a given Less file path", function() {
      spyOn(cache, 'parseLess').and.callThrough();
      expect(cache.readFileSync(join(fixturesDir, 'imports.less'))).toBe(`body {
  a: 1;
  b: 2;
  c: 3;
  d: 4;
}
`);
      expect(cache.parseLess.calls.count()).toBe(0);
      expect(cache.stats.hits).toBe(1);
      return expect(cache.stats.misses).toBe(1);
    });
    it("reflects changes to the file being read", function() {
      fs.writeFileSync(join(fixturesDir, 'imports.less'), 'body { display: block; }');
      css = cache.readFileSync(join(fixturesDir, 'imports.less'));
      return expect(css).toBe(`body {
  display: block;
}
`);
    });
    it("reflects changes to files imported by the file being read", function() {
      fs.writeFileSync(join(fixturesDir, 'b.less'), '@b: 20;');
      css = cache.readFileSync(join(fixturesDir, 'imports.less'));
      return expect(css).toBe(`body {
  a: 1;
  b: 20;
  c: 3;
  d: 4;
}
`);
    });
    it("reflects changes to files on the import path", function() {
      fs.writeFileSync(join(fixturesDir, 'imports-1', 'd.less'), '@d: 40;');
      cache.setImportPaths(cache.getImportPaths());
      css = cache.readFileSync(join(fixturesDir, 'imports.less'));
      expect(css).toBe(`body {
  a: 1;
  b: 2;
  c: 3;
  d: 40;
}
`);
      fs.unlinkSync(join(fixturesDir, 'imports-1', 'c.less'));
      cache.setImportPaths(cache.getImportPaths());
      css = cache.readFileSync(join(fixturesDir, 'imports.less'));
      expect(css).toBe(`body {
  a: 1;
  b: 2;
  c: 30;
  d: 40;
}
`);
      fs.writeFileSync(join(fixturesDir, 'imports-1', 'd.less'), '@d: 400;');
      cache.setImportPaths(cache.getImportPaths());
      css = cache.readFileSync(join(fixturesDir, 'imports.less'));
      return expect(css).toBe(`body {
  a: 1;
  b: 2;
  c: 30;
  d: 400;
}
`);
    });
    it("reflect changes to the import paths array", function() {
      spyOn(cache, 'parseLess').and.callThrough();
      cache.setImportPaths([join(fixturesDir, 'imports-1'), join(fixturesDir, 'imports-2')]);
      cache.readFileSync(join(fixturesDir, 'imports.less'));
      expect(cache.parseLess.calls.count()).toBe(0);
      cache.setImportPaths([join(fixturesDir, 'imports-2'), join(fixturesDir, 'imports-1'), join(fixturesDir, 'import-does-not-exist')]);
      css = cache.readFileSync(join(fixturesDir, 'imports.less'));
      expect(css).toBe(`body {
  a: 1;
  b: 2;
  c: 30;
  d: 4;
}
`);
      expect(cache.parseLess.calls.count()).toBe(1);
      cache.parseLess.calls.reset();
      cache.setImportPaths([join(fixturesDir, 'imports-1'), join(fixturesDir, 'imports-2')]);
      expect(cache.readFileSync(join(fixturesDir, 'imports.less'))).toBe(`body {
  a: 1;
  b: 2;
  c: 3;
  d: 4;
}
`);
      return expect(cache.parseLess.calls.count()).toBe(0);
    });
    it("reuses cached CSS across cache instances", function() {
      var cache2;
      cache2 = new LessCache({
        cacheDir: cache.getDirectory(),
        importPaths: cache.getImportPaths()
      });
      spyOn(cache2, 'parseLess').and.callThrough();
      cache2.readFileSync(join(fixturesDir, 'imports.less'));
      return expect(cache2.parseLess.calls.count()).toBe(0);
    });
    it("throws compile errors", function() {
      return expect(function() {
        return cache.readFileSync(join(fixturesDir, 'invalid.less'));
      }).toThrow();
    });
    it("throws file not found errors", function() {
      return expect(function() {
        return cache.readFileSync(join(fixturesDir, 'does-not-exist.less'));
      }).toThrow();
    });
    it("relativizes cache paths based on the configured resource path", function() {
      var cache2;
      cache2 = new LessCache({
        cacheDir: cache.getDirectory(),
        importPaths: cache.getImportPaths(),
        resourcePath: fixturesDir
      });
      expect(fs.existsSync(join(cache2.importsCacheDir, 'content', 'imports.json'))).toBeFalsy();
      cache2.readFileSync(join(fixturesDir, 'imports.less'));
      return expect(fs.existsSync(join(cache2.importsCacheDir, 'content', 'imports.json'))).toBeTruthy();
    });
    return it("uses the fallback directory when no cache entry is found in the primary directory", function() {
      var cache2, cache3;
      cache2 = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'cache2'),
        importPaths: cache.getImportPaths(),
        fallbackDir: cache.getDirectory(),
        resourcePath: fixturesDir
      });
      cache2.readFileSync(join(fixturesDir, 'imports.less'));
      cache3 = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'cache3'),
        importPaths: cache2.getImportPaths(),
        fallbackDir: cache2.getDirectory(),
        resourcePath: fixturesDir
      });
      spyOn(cache3, 'parseLess').and.callThrough();
      cache3.readFileSync(join(fixturesDir, 'imports.less'));
      return expect(cache3.parseLess.calls.count()).toBe(0);
    });
  });
  describe("when syncCaches option is set to true", function() {
    it("writes the cache entry to the fallback cache when initially uncached", function() {
      var cacheCss, fallback, fallbackCss;
      fallback = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'fallback'),
        resourcePath: fixturesDir
      });
      cache = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'synced'),
        syncCaches: true,
        fallbackDir: join(dirname(cache.getDirectory()), 'fallback'),
        resourcePath: fixturesDir
      });
      cacheCss = cache.readFileSync(join(fixturesDir, 'a.less'));
      expect(cache.stats.hits).toBe(0);
      expect(cache.stats.misses).toBe(1);
      fallbackCss = fallback.readFileSync(join(fixturesDir, 'a.less'));
      expect(fallback.stats.hits).toBe(1);
      expect(fallback.stats.misses).toBe(0);
      return expect(cacheCss).toBe(fallbackCss);
    });
    it("writes the cache entry to the fallback cache when read from the main cache", function() {
      var cacheWithFallback, fallback;
      cache = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'synced'),
        resourcePath: fixturesDir
      });
      fallback = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'fallback'),
        resourcePath: fixturesDir
      });
      cacheWithFallback = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'synced'),
        syncCaches: true,
        fallbackDir: join(dirname(cache.getDirectory()), 'fallback'),
        resourcePath: fixturesDir
      });
      // Prime main cache
      cache.readFileSync(join(fixturesDir, 'a.less'));
      // Read from main cache with write to fallback
      cacheWithFallback.readFileSync(join(fixturesDir, 'a.less'));
      // Read from fallback cache
      fallback.readFileSync(join(fixturesDir, 'a.less'));
      expect(fallback.stats.hits).toBe(1);
      return expect(fallback.stats.misses).toBe(0);
    });
    return it("writes the cache entry to the main cache when read from the fallback cache", function() {
      var cacheWithFallback, fallback;
      cache = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'synced'),
        resourcePath: fixturesDir
      });
      fallback = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'fallback'),
        resourcePath: fixturesDir
      });
      cacheWithFallback = new LessCache({
        cacheDir: join(dirname(cache.getDirectory()), 'synced'),
        syncCaches: true,
        fallbackDir: join(dirname(cache.getDirectory()), 'fallback'),
        resourcePath: fixturesDir
      });
      // Prime fallback cache
      fallback.readFileSync(join(fixturesDir, 'a.less'));
      // Read from fallback with write to main cache
      cacheWithFallback.readFileSync(join(fixturesDir, 'a.less'));
      // Read from main cache
      cache.readFileSync(join(fixturesDir, 'a.less'));
      expect(cache.stats.hits).toBe(1);
      return expect(cache.stats.misses).toBe(0);
    });
  });
  describe("when providing a resource path and less sources by relative file path", function() {
    return it("reads from the provided sources first, and falls back to reading from disk if a valid source isn't available", function() {
      var cache1, cache2, cache3, cacheDir;
      cacheDir = join(tempDir, 'source-cache');
      cache1 = new LessCache({
        cacheDir: cacheDir,
        importPaths: [join(fixturesDir, 'imports-1'), join(fixturesDir, 'imports-2')],
        resourcePath: fixturesDir,
        lessSourcesByRelativeFilePath: {
          'imports.less': {
            content: `@import "a";
@import "b";
@import "c";
@import "d";

some-selector {
  prop-1: @a;
  prop-2: @b;
  prop-3: @c;
  prop-4: @d;
}`,
            digest: 'digest-1'
          }
        }
      });
      expect(cache1.readFileSync(join(fixturesDir, 'imports.less'))).toBe(`some-selector {
  prop-1: 1;
  prop-2: 2;
  prop-3: 3;
  prop-4: 4;
}\n`);
      cache2 = new LessCache({
        cacheDir: cacheDir,
        importPaths: [join(fixturesDir, 'imports-1'), join(fixturesDir, 'imports-2')],
        resourcePath: fixturesDir,
        lessSourcesByRelativeFilePath: {
          'imports.less': {
            content: `@import "a";
@import "b";
@import "c";
@import "d";

some-selector {
  prop-1: @a;
  prop-2: @b;
  prop-3: @c;
  prop-4: @d;
}`,
            digest: 'digest-2'
          },
          'imports-1/c.less': {
            content: `@c: "changed";`,
            digest: 'digest-3'
          }
        }
      });
      expect(cache2.readFileSync(join(fixturesDir, 'imports.less'))).toBe(`some-selector {
  prop-1: 1;
  prop-2: 2;
  prop-3: "changed";
  prop-4: 4;
}\n`);
      cache3 = new LessCache({
        cacheDir: cacheDir,
        importPaths: [join(fixturesDir, 'imports-1'), join(fixturesDir, 'imports-2')],
        resourcePath: fixturesDir,
        lessSourcesByRelativeFilePath: {
          'imports.less': {
            content: `@import "c";

foo {
  bar: @c;
}`,
            digest: 'digest-2'
          },
          'imports-1/c.less': {
            content: `@c: "changed again";`,
            digest: 'digest-3'
          }
        }
      });
      return expect(cache3.readFileSync(join(fixturesDir, 'imports.less'))).toBe(`some-selector {
  prop-1: 1;
  prop-2: 2;
  prop-3: "changed";
  prop-4: 4;
}\n`);
    });
  });
  return describe("when providing a resource path and import files by relative file path", function() {
    return it("reads from the provided file paths first, and falls back to reading from disk if a valid file path isn't available", function() {
      var cache1, cacheDir;
      cacheDir = join(tempDir, 'import-path-cache');
      cache1 = new LessCache({
        cacheDir: cacheDir,
        importPaths: [join(fixturesDir, 'imports-1'), join(fixturesDir, 'imports-2')],
        resourcePath: fixturesDir,
        importedFilePathsByRelativeImportPath: {
          'imports-1': ['imports-1/in-memory-1.less', 'imports-1/in-memory-2.less']
        }
      });
      return expect(cache1.getImportedFiles(cache1.importPaths)).toEqual(['imports-1/in-memory-1.less', 'imports-1/in-memory-2.less', 'imports-2/c.less', 'imports-2/d.less']);
    });
  });
});
