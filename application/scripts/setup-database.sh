#!/bin/sh
set -eu

node dist/db/db-migrate.js
node dist/db/db-seed.js --if-empty
if [ "${PRICE_SUGGESTIONS_ENABLED:-false}" = "true" ]; then
  node dist/db/db-price-roles.js
fi
