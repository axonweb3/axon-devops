#!/usr/bin/env python
import sys
import datetime
import os
import argparse
import datetime
from glob import glob

parser = argparse.ArgumentParser(description='get chain name')
parser.add_argument('--commit_id', '-c', type=str)
parser.add_argument('--node_num', '-n', type=int)
parser.add_argument('--force_recreate', '-f', default=False, action='store_true')

# args = parser.parse_args(['-c', 'commitid', '-n', '4', '-f'])
args = parser.parse_args()
# print(args)

chains = sorted(glob('{commid_id}-{node_num:03d}-*/'.format(commid_id=args.commit_id, node_num=args.node_num)), reverse=True)
# print(chains)
if args.force_recreate or not chains:
    now = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    new_chain = '{args.commit_id}-{args.node_num:03d}-{now}'.format(datetime=datetime, args=args, now=now)
else:
    new_chain = chains[0]

print(new_chain)
