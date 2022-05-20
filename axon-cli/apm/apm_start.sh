#!/bin/bash

cd $(dirname $0)
cd deploy
make monitor-deploy
make agent-deploy

