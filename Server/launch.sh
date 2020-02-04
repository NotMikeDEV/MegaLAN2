#!/bin/sh

# Register Autorun
if [ ! -f /etc/systemd/system/MegaLAN.service ]; then
cat > /etc/systemd/system/MegaLAN.service <<EOF
[Unit]
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

# Start Services
/MegaLAN/mariadb.lua start  </dev/null >/dev/null 2>&1 &

exit 0