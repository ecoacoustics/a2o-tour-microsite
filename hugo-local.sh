#!/bin/sh

set -a
. "$(dirname "$0")/.env.local"
set +a

exec hugo "$@"