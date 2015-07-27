#!/usr/bin/env sh

# This script is designed to start two sitecues proxies, as needed in production.
# It is NOT intended for development use, please do not use it for that.
# If you do, our metrics data will become polluted and less valuable,
# due to the Site ID that is set here for convenience.

# TODO: Get this functionality into a Grunt/Gulp task
#       as soon as possible, to be cross-platform.

# Shut down existing proxies that are online.
pm2 stop sitecues-proxy;
pm2 stop sitecues-rev-proxy;
pm2 delete sitecues-proxy;
pm2 delete sitecues-proxy;

# Our proxies check the environment for a Site ID to use in the sitecues loader.
# This ID is meant for production, to track metrics.
SITE_ID='s-98595d91';

# Path where PM2 can find the CLI entry point to start proxies.
PROXY_BIN='bin/sitecues-proxy.js';

# WORKAROUND: This fixes a problem with the proxy leaking memory.
MAX_MEM='180M';

# Start a forward proxy.
pm2 start $PROXY_BIN --name='sitecues-proxy' --max-memory-restart=$MAX_MEM --log='log/all.log' --output='log/out.log' --error='log/err.log';

# Now start another proxy instance, in reverse mode.
# Because it is the same binary, we must 'force' it to make PM2 happy.
REVERSE=true;
pm2 start $PROXY_BIN --name='sitecues-rev-proxy' --force --max-memory-restart=$MAX_MEM --log='log/all-rev.log' --output='log/out-rev.log' --error='log/err-rev.log';
