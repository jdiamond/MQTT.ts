#!/bin/bash

# Copy the source.
rm -rf src
mkdir src
cp -r ../client src
cp -r ../packets src
cp ../types.ts src
cp ../node.ts src

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
  --out node.js \
  src/node.ts

# Add a declaration for the package.
echo "declare module \"@jdiamond/mqtt\" {
    export * from \"node\";
}" >> node.d.ts
