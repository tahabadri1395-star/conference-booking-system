#!/bin/sh
set -e
cd client
rm -rf node_modules
npm install
npm run build
