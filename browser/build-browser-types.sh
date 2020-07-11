#!/bin/bash

# Copy the source.
rm -rf src
mkdir -p src/browser
cp -r ../client src
cp -r ../lib src
cp -r ../packets src
cp ./index.ts src/browser
cp ./browser_client.ts src/browser

# Strip off the .ts extensions from the imports.
find src -type f -print | while read f; do
  echo $f
  sed -i "" -e "s/\\.ts';$/';/" $f
done

# Generate the .d.ts file.
./node_modules/.bin/tsc \
  --lib es6,dom,esnext.asynciterable \
  --target es6 \
  --declaration \
  --emitDeclarationOnly \
  --out index.js \
  src/browser/index.ts

# Add a declaration for the package.
echo "declare module \"@jdiamond/mqtt-browser\" {
    export * from \"browser/index\";
}" >> index.d.ts
