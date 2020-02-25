import subprocess

import fabric

import acdb
import conf
import util


def make_pool():
    instance_list = acdb.db.load("instance_list")
    ip_list = [instance["PublicIpAddress"]["IpAddress"][0] for instance in instance_list]
    pool = fabric.ThreadingGroup(*ip_list, user="root", connect_kwargs={
        "key_filename": "./res/id_rsa",
    })
    pool.run("echo Welcome!")
    return pool


def deploy_binary():
    pool = make_pool()
    with util.chdir(conf.config["muta"]["path"]):
        subprocess.call("python3 -m zipfile -c build.zip build", shell=True)
        pool.run("killall muta-chain | true")
        pool.run("rm -rf build")
        for e in pool:
            print(f"Upload build.zip {e.host}")
            e.put("build.zip", "build.zip")
    pool.run("python3 -m zipfile -e build.zip . && cd build && chmod +x muta-chain")


def deploy_run():
    pool = make_pool()
    pool.run("killall muta-chain | true")
    pool.run(f"rm -rf {conf.config['muta']['data_path']}")
    for i, e in enumerate(pool):
        print(f"Start on {e.host}")
        e.run(
            f"cd build && (CONFIG=config_{i+1}.toml GENESIS=genesis.toml nohup ./muta-chain >& log < /dev/null &) && sleep 1")
