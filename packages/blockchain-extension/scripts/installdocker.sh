#!/usr/bin/env bash

retries=0
brew install --cask docker

# manually setup docker, as versions after 2.0.0.3-ce-mac81,31259 cannot be installed using cli
# thanks to https://github.com/docker/for-mac/issues/2359#issuecomment-853420567

# allow the app to run without confirmation
xattr -d -r com.apple.quarantine /Applications/Docker.app

# preemptively do docker.app's setup to avoid any gui prompts
sudo /bin/cp /Applications/Docker.app/Contents/Library/LaunchServices/com.docker.vmnetd /Library/PrivilegedHelperTools

# the plist we need used to be in /Applications/Docker.app/Contents/Resources, but
# is now dynamically generated. So we dynamically generate our own
sudo tee "/Library/LaunchDaemons/com.docker.vmnetd.plist" > /dev/null <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>Label</key>
	<string>com.docker.vmnetd</string>
	<key>Program</key>
	<string>/Library/PrivilegedHelperTools/com.docker.vmnetd</string>
	<key>ProgramArguments</key>
	<array>
		<string>/Library/PrivilegedHelperTools/com.docker.vmnetd</string>
	</array>
	<key>RunAtLoad</key>
	<true/>
	<key>Sockets</key>
	<dict>
		<key>Listener</key>
		<dict>
			<key>SockPathMode</key>
			<integer>438</integer>
			<key>SockPathName</key>
			<string>/var/run/com.docker.vmnetd.sock</string>
		</dict>
	</dict>
	<key>Version</key>
	<string>59</string>
</dict>
</plist>

EOF

sudo /bin/chmod 544 /Library/PrivilegedHelperTools/com.docker.vmnetd
sudo /bin/chmod 644 /Library/LaunchDaemons/com.docker.vmnetd.plist
sudo /bin/launchctl load /Library/LaunchDaemons/com.docker.vmnetd.plist

sleep 5

# install docker as before
open -g /Applications/Docker.app || exit

while ! docker info 2>/dev/null ; do
    sleep 5
    retries=`expr $retries + 1`
    if pgrep -xq -- "Docker"; then
        echo 'docker still running'
    else
        echo 'docker not running, restart'
        open -g /Applications/Docker.app || exit
    fi
    if [ $retries -gt 60 ]; then
        >&2 echo 'Failed to run docker'
        exit 1
    fi;

    echo 'Waiting for docker service to be in the running state'
done
