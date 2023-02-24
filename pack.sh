#!/bin/bash

: ${outdir:="$HOME/Downloads"}
package_name="minimal-bilibili"
manifest_path="public/manifest.json"

version=$(grep '"version' "$manifest_path" | grep -Eo '\d.\d.\d')
if [ -z "$version" ]; then
    echo "cannot get version"
    exit 1
fi
filename="${package_name}-$version.zip"

pushd dist
zip $filename * -vr -x 'types*'
mv $filename $outdir
popd

echo "Result:"
ls -l $outdir/$filename
