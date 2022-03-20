#!/bin/sh

# Check that the script is run from the correct directory.
FILE=./package.json;
if [ -f "$FILE" ]; then
  echo "Script ready.";
else
  echo "Error: Script not run from the correct directory. This script must be run from the repository directory.";
  exit 255;
fi

# Start Redis emulator.
sh ./.scripts/start-background-redis-server.sh;

# Run tests
mocha --recursive --require ts-node/register 'test/**/*.ts';

# Save exit code of tests
testsExitCode=$?

# Stop Redis server
killall redis-server;

# Quit with same exit code of tests
exit $testsExitCode
