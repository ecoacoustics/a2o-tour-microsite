#!/bin/sh

set -a
. "$(dirname "$0")/.env.local"
set +a

if [ "${1:-}" = "server" ]; then
	set -- "$@" -DEF --tlsAuto --disableFastRender --navigateToChanged --poll 700ms --ignoreCache --noHTTPCache
fi

exec hugo "$@"