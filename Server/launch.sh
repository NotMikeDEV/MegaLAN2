#!/bin/bash

# Register Autorun
if [ ! -f /etc/systemd/system/MegaLAN.service ]; then
cat > /etc/systemd/system/MegaLAN.service <<EOF
[Unit]
After=networking.service
Description=MegaLAN Service.
ConditionPathExists=/MegaLAN/launch.sh

[Service]
Type=forking
ExecStart=/MegaLAN/launch.sh
RemainAfterExit=yes
SysVStartPriority=99

[Install]
WantedBy=multi-user.target
EOF
chmod 0644 /etc/systemd/system/MegaLAN.service
systemctl daemon-reload
systemctl enable MegaLAN
fi
# Wait for network to be up
while [ "$(ip addr|grep "inet "|grep global|cut -d " " -f 6|cut -d "/" -f 1|head -n 1)" == "" ]; do echo Waiting for IPv4...; sleep 1; done
while [ "$(ip addr|grep "inet6 "|grep global|cut -d " " -f 6|cut -d "/" -f 1|head -n 1)" == "" ]; do echo Waiting for IPv6...; sleep 1; done

# Start Services
/MegaLAN/mariadb.lua start  </dev/null >/dev/null 2>&1 &
/MegaLAN/nodeapp.lua start  </dev/null >/dev/null 2>&1 &

exit 0