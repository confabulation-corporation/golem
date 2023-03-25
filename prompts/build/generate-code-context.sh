#!/bin/sh

find src/ golems/ -type f ! -name '*.svg' ! -name '*~' ! -name '*.ico' -print0 | xargs -0 -I{} sh -c 'echo {}; echo "==================================" ; echo; echo ; cat {}' | pbcopy
