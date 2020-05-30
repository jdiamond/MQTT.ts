#!/bin/bash

# Copy the source.
rm -rf src
mkdir -p src/node
cp -r ../client src
cp -r ../lib src
cp -r ../packets src
cp ./index.ts src/node
cp ./node_client.ts src/node

# Strip off the .ts extensions from the imports.
find src -type f -print | while read f; do
  echo $f
  sed -i "" -e "s/\\.ts';$/';/" $f
done

# Generate the .d.ts file.
./node_modules/.bin/tsc \
  --lib es6,dom \
  --types node \
  --target es6 \
  --declaration \
  --emitDeclarationOnly \
  --out index.js \
  src/node/index.ts

# Add a declaration for the package.
echo "declare module \"@jdiamond/mqtt\" {
    export * from \"node/index\";
}" >> index.d.ts
