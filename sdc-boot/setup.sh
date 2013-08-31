#!/usr/bin/bash
#
# Copyright (c) 2011 Joyent Inc., All rights reserved.
#

export PS4='[\D{%FT%TZ}] ${BASH_SOURCE}:${LINENO}: ${FUNCNAME[0]:+${FUNCNAME[0]}(): }'
set -o xtrace

PATH=/opt/local/bin:/opt/local/sbin:/usr/bin:/usr/sbin

role=dapi
app_name=$role

# Let SAPI know where the local manifests are
CONFIG_AGENT_LOCAL_MANIFESTS_DIRS=/opt/smartdc/dapi

# Include common utility functions (then run the boilerplate)
source /opt/smartdc/sdc-boot/lib/util.sh
sdc_common_setup

# Cookie to identify this as a SmartDC zone and its role
mkdir -p /var/smartdc/dapi

# Install DAPI
mkdir -p /opt/smartdc/dapi
chown -R nobody:nobody /opt/smartdc/dapi

# Add node_modules/bin to PATH
echo "" >>/root/.profile
echo "export PATH=\$PATH:/opt/smartdc/$role/build/node/bin:/opt/smartdc/$role/node_modules/.bin" >>/root/.profile

# Install Amon monitor and probes
TRACE=1 /opt/smartdc/dapi/bin/install-amon-probes

# All done, run boilerplate end-of-setup
sdc_setup_complete

exit 0
