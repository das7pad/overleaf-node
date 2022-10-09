#!/usr/bin/env bash

FILES=$(find public/ -type f -not -name '*.gz')

for file in ${FILES}; do
  file_gzipped="$file.gz"

  if [[ -f "$file_gzipped" ]]; then
    continue
  fi

  gzip -6 --no-name --stdout "$file" > "$file_gzipped"

  before=$(stat -c%s "$file")
  after=$(stat -c%s "$file_gzipped")
  if [[ "$after" -ge "$before" ]]; then
    rm "$file_gzipped"
  fi
done
