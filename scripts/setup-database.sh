#!/bin/sh
set -eu

node dist/db/db-migrate.js
node dist/db/db-seed.js --if-empty
