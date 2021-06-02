# Install latest version of Docker Desktop for Mac
echo 'Downloading and then running docker brew formula ...'

# The brew formula below will install Docker Desktop for Mac, v2.0.0.3,31259.
dockerInstallationScriptName='docker.rb'
dockerInstallationScriptUrl="https://raw.githubusercontent.com/Homebrew/homebrew-cask/8ce4e89d10716666743b28c5a46cd54af59a9cc2/Casks/$dockerInstallationScriptName"
curl -L  $dockerInstallationScriptUrl > $dockerInstallationScriptName && brew install $dockerInstallationScriptName


echo 'Installing Docker Desktop for Mac ...'
sudo /Applications/Docker.app/Contents/MacOS/Docker --quit-after-install --unattended
/Applications/Docker.app/Contents/MacOS/Docker --unattended &

echo 'Starting Docker service ...'

start=$SECONDS

retries=0
maxRetries=30

while ! docker info 2>/dev/null ; do
    sleep 5s
    ((retries=retries+1))

    if pgrep -xq -- 'Docker'; then
        echo 'Docker still running'
    else
        echo 'Docker not running, restart'
        /Applications/Docker.app/Contents/MacOS/Docker --unattended &
    fi

    if [[ ${retries} -gt ${maxRetries} ]]; then
        >&2 echo 'Failed to run docker'
        exit 1
    fi;

    echo 'Waiting for Docker service to be in running state ...'
done
