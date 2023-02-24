#!/bin/bash

dist_dir="$PWD/dist"
build_dir="$PWD/build"
package_name="minimal-bilibili"
manifest_path="public/manifest.json"

version=$(grep '"version' "$manifest_path" | grep -Eo '\d.\d.\d')
if [ -z "$version" ]; then
    echo "cannot get version"
    exit 1
fi
filename="${package_name}-$version.zip"

pushd "$build_dir"
zip $filename * -vr -x 'types*'
mkdir -p "$dist_dir"
mv $filename "$dist_dir"
popd

echo "Result:"
ls -l "$dist_dir/$filename"
