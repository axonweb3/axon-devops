#!/usr/bin/env python
import sys
import datetime
import os
import argparse
import datetime
from glob import glob
import json

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
    start_time = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    current_chain_meta = {
        'start_time': start_time,
        'commit_id': args.commit_id,
        'node_num': args.node_num,
    }
    new_chain = '{commit_id}-{node_num:03d}-{start_time}'.format(**current_chain_meta)
    current_chain_meta['chain_id'] = new_chain
else:
    new_chain = chains[0].strip('/')
    start_time = new_chain.split('-')[-1]
    current_chain_meta = {
        'start_time': start_time,
        'commit_id': args.commit_id,
        'node_num': args.node_num,
        'chain_id': new_chain,
    }


json.dump(current_chain_meta, open('current_chain_meta.json', 'w'), indent=4)


print(new_chain)
