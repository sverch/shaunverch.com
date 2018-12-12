#!/bin/bash

SERVICE_NAME="web-$(git rev-parse --short HEAD)"
python example-static-site/helpers/deploy.py shaunverch-site consul-1 "$SERVICE_NAME" \
    shaunverch.com https://github.com/sverch/shaunverch.com/ "Shaun Verch"
