#!/bin/bash

cd $(dirname $0)
cd deploy
make monitor-clean
make agent-clean

