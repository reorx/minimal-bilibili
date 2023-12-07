#!/bin/bash

: ${TARGET:=chrome}
echo "pack target: ${TARGET}"
dist_dir="$PWD/dist/${TARGET}"
build_dir="$PWD/build/${TARGET}"
package_name="minimal-bilibili"
manifest_path="$build_dir/manifest.json"

# build
rm -rf "$build_dir"
npm run build

# version
version=$(grep '"version' "$manifest_path" | grep -Eo '\d.\d.\d')
if [ -z "$version" ]; then
    echo "cannot get version"
    exit 1
fi
filename="${package_name}-$version.zip"

# pack
pushd "$build_dir"
zip $filename * -vr -x 'types*'
mkdir -p "$dist_dir"
mv $filename "$dist_dir"
popd

echo "Result:"
ls -l "$dist_dir/$filename"
