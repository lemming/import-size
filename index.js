const path = require("path");
const arg = require("arg");

const { importCost, cleanup, JAVASCRIPT } = require("import-cost");

function generateImports(library, methods) {
  let res = '';
  if (methods.length === 0) {
    res += `import "${library}";`
  }
  if (methods.indexOf("*") !== -1) {
    res += `import * as _everything_ from "${library}";`
  }
  if (methods.indexOf("default") !== -1) {
    res += `import _default_ from "${library}";`
  }
  const namedImports = methods.filter(m => m !== "*" && m !== "default");
  namedImports.forEach(i => {
    if (!/^[\w_$][\w\d_$]*?$/.test(i)) {
      throw new Error(`Invalid import: '${i}'`)
    }
  })
  if (namedImports.length > 0) {
    res += `import {${namedImports.join(",")}} from '${library}';`
  }
  console.log(res)
  return res;
}

async function analyze(dir, library, methods) {
  let resolve, reject;

  const p = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  const target = path.join(dir, "import-size.js");
  const emitter = importCost(
    target,
    generateImports(library, methods),
    JAVASCRIPT
  );

  emitter.on("error", e => {
    stop();
    reject(e);
  });
  emitter.on("done", packages => {
    stop();
    if (packages.length === 0) {
      return reject("No packages found");
    }
    if (packages.length > 1) {
      console.warn("Multiple packages found");
    }
    console.log(packages[0].gzip);
    resolve();
  });

  function stop() {
    emitter.removeAllListeners();
    cleanup();
  }

  return p;
}

function main() {
  const args = arg({
    "--help": Boolean,
    "--version": Boolean
  });

  if (args["--version"]) {
    console.log(require("./package.json").version);
    process.exit(0);
  }
  if (args["--help"]) {
    console.log(
      "Usage: import-size [library] [...methods]\nExample: import-size mobx autorun observable"
    );
    process.exit(0);
  }

  if (args._.length < 1) {
    console.error("requires at least one argument");
    process.exit(1);
  }

  const [library, ...methods] = args._;
  analyze(process.cwd(), library, methods).then(
    () => {
      process.exit(0);
    },
    e => {
      console.error(e);
      process.exit(1);
    }
  );
}

main();

module.exports = { analyze };
