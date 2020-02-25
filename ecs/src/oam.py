import json
import sys
import subprocess

import fabric
import requests

import conf
import deploy


def oam_sh():
    pool = deploy.make_pool()
    for _ in range(1 << 32):
        s = input("> ")
        try:
            pool.run(s)
        except fabric.exceptions.GroupException:
            pass


def oam_bench():
    args = sys.argv[3:]
    while True:
        output = subprocess.getoutput(" ".join(["muta-bench", *args]))
        last = output.splitlines()[-1]
        data = json.loads(last)
        blocks = data["blocks"]
        msgs = {
            "name": sys.argv[2],
            "avg_round": sum([e[2] for e in blocks]) / len(blocks),
            "tx/block": data["tx_block"],
            "sec/block": data["sec_block"],
            "tx/sec": data["tx_sec"],
        }
        requests.post(f"https://api.telegram.org/bot{conf.secret['telegram']['token']}/sendMessage", data={
            "chat_id": conf.secret["telegram"]["chat_id"],
            "text": json.dumps(msgs, indent=4),
        })
