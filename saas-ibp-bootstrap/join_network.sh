#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
IMPORT_EXPORT_REQUIRED=0
function usage {
    echo "Usage: join_network.sh [-i] [join|destroy]" 1>&2
    exit 1
}
while getopts ":i" OPT; do
    case ${OPT} in
        i)
            IMPORT_EXPORT_REQUIRED=1
            ;;
        \?)
            usage
            ;;
    esac
done
shift $((OPTIND -1))
COMMAND=$1
if [ "${COMMAND}" = "join" ]; then
    set -x
    ansible-playbook 12-create-endorsing-organization-components.yml
    if [ "${IMPORT_EXPORT_REQUIRED}" = "1" ]; then
        ansible-playbook 13-export-organization.yml
        ansible-playbook 14-import-organization.yml
    fi
    ansible-playbook -e channel_name=mychannel1 15-add-organization-to-channel.yml
    ansible-playbook -e channel_name=mychannel2 15-add-organization-to-channel.yml
    if [ "${IMPORT_EXPORT_REQUIRED}" = "1" ]; then
        ansible-playbook 16-import-ordering-service.yml
    fi
    ansible-playbook -e channel_name=mychannel1 17-join-peer-to-channel.yml
    ansible-playbook -e channel_name=mychannel1 18-add-anchor-peer-to-channel.yml
    ansible-playbook -e channel_name=mychannel2 17-join-peer-to-channel.yml
    ansible-playbook -e channel_name=mychannel2 18-add-anchor-peer-to-channel.yml

    set +x
elif [ "${COMMAND}" = "destroy" ]; then
    set -x
    if [ "${IMPORT_EXPORT_REQUIRED}" = "1" ]; then
        ansible-playbook 97-delete-endorsing-organization-components.yml --extra-vars '{"import_export_used":true}'
        ansible-playbook 98-delete-endorsing-organization-components.yml --extra-vars '{"import_export_used":true}'
        ansible-playbook 99-delete-ordering-organization-components.yml --extra-vars '{"import_export_used":true}'
    else
        ansible-playbook 97-delete-endorsing-organization-components.yml
        ansible-playbook 98-delete-endorsing-organization-components.yml
        ansible-playbook 99-delete-ordering-organization-components.yml
    fi
    set +x
else
    usage
fi