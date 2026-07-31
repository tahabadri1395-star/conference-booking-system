#!/bin/sh
set -e
cd client
npm install --include=dev
npm run build
