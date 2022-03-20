#!/bin/sh

# Kill previous redis-server process.
killall redis-server; # May print "No matching processes belonging to you were found"

# Delete previous backup of Redis.
rm dump.rdb; # If not present: No such file or directory

# Start redis-server and continue execution without waiting for the command to end
# (this command will end after redis has been stopped)
echo "Starting redis-server..."
redis-server &

# Wait for redis to be started, before continuing execution
sleep 3;
