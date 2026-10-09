#!/bin/sh
set -eu

exec node scripts/run-database-setup.mjs
