#!/bin/sh

set -a
. "$(dirname "$0")/.env.local"
set +a

if [ "${1:-}" = "server" ]; then
	rm -rf "$(dirname "$0")/resources/_gen"
	set -- "$@" -DEF --tlsAuto --disableFastRender --navigateToChanged --poll 700ms --ignoreCache --noHTTPCache --gc --renderToMemory
fi

exec hugo "$@"