#!/bin/bash

set -euo pipefail

SERVICE_NAME="web-$(git rev-parse --short HEAD)"
pipenv run python example-static-site/helpers/deploy.py shaunverch-site consul-1 "$SERVICE_NAME" \
    shaunverch.com https://github.com/sverch/shaunverch.com/ "Shaun Verch"
pipenv run cldls service get shaunverch-site "${SERVICE_NAME}"
PUBLIC_IP="$(pipenv run cldls service get shaunverch-site "${SERVICE_NAME}" | grep public_ip | awk -F: '{print $2}' | tr -d '[:space:]')"
OTHER_SERVICE="$(pipenv run cldls service ls | grep "Network: shaunverch-site, Service: web-" | grep -v "${SERVICE_NAME}" | awk '{print $4}' | tr -d '[:space:]')"
OLD_PUBLIC_IP="$(pipenv run cldls service get shaunverch-site "${OTHER_SERVICE}" | grep public_ip | awk -F: '{print $2}' | tr -d '[:space:]')"
echo "Old Service: ${OTHER_SERVICE}"
pipenv run python example-static-site/helpers/update_dns.py shaunverch.com "${PUBLIC_IP}" --subdomain gce
pipenv run python example-static-site/helpers/update_dns.py shaunverch.com "${OLD_PUBLIC_IP}" --subdomain gce --remove
echo "When dns settles:"
echo "pipenv run cldls service destroy shaunverch-site ${OTHER_SERVICE}"
