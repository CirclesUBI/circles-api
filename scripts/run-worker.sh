#!/bin/sh

# Fix "JavaScript heap out of memory" error, see:
# https://stackoverflow.com/questions/53230823/fatal-error-ineffective-mark-compacts-near-heap-limit-allocation-failed-javas
export NODE_OPTIONS="--max-old-space-size=4096"

node ./build/worker.js
