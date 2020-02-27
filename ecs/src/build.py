import copy
import json
import os
import subprocess

import acdb
import conf
import toml
import util


def get_int(name, default):
    s = input(f"{name}({default}): ")
    if s:
        return int(s)
    return default


def muta_docker():
    with util.chdir(conf.config["muta"]["path"]):
        commit_id = subprocess.getoutput('git log -1 --pretty="%h"')
        image_tag = f"{conf.config['muta']['docker_username']}/muta:{commit_id}"
        subprocess.call(f"docker build -t {image_tag} .", shell=True)
        subprocess.call(f"docker push {image_tag}", shell=True)
    return {
        "image_tag": image_tag
    }


def muta_binary():
    with util.chdir(conf.config["muta"]["path"]):
        subprocess.call("cargo build --release --example muta-chain", shell=True)
        with util.chdir("./devtools/keypair"):
            subprocess.call("cargo build --release", shell=True)

        subprocess.call("rm -rf build", shell=True)
        subprocess.call("mkdir -p build", shell=True)
        subprocess.call("cp ./target/release/examples/muta-chain ./build", shell=True)
        subprocess.call("cp ./target/release/muta-keypair ./build", shell=True)


def muta_config_request():
    use_public_ip = conf.config["muta"]["use_public_ip"] == 1
    instance_list = acdb.db.load("instance_list")
    node_list = {"node": []}
    for i, instance in enumerate(instance_list):
        host = ""
        if use_public_ip:
            host = instance["PublicIpAddress"]["IpAddress"][0]
        else:
            host = instance["NetworkInterfaces"]["NetworkInterface"][0]["PrimaryIpAddress"]
        data = {
            "host": host,
            "api_port": 8000,
            "p2p_port": 1337,
            "data": conf.config["muta"]["data_path"],
            "bp": True,
        }
        if i >= (len(instance_list) - conf.config["muta"]["sync_node_number"]):
            data["bp"] = False
        node_list["node"].append(data)
    with open("./res/muta_config_request.toml", "w") as f:
        toml.dump(node_list, f)


def muta_config():
    c_poolsize = get_int("poolsize", 200000)
    c_timeout_gap = get_int("timeout_gap", 999999)
    c_cycles_limit = get_int("cycles_limit", 630000000)
    c_tx_num_limit = get_int("tx_num_limit", 30000)

    with open("./res/muta_config_request.toml") as f:
        face_config_list = toml.load(f)["node"]

    with util.chdir(conf.config["muta"]["path"]):
        r = subprocess.getoutput(f"./build/muta-keypair -n {len(face_config_list)}")
        with open("./build/keypairs.json", "w") as f:
            f.write(r)
        keypairs = json.loads(r)

        assert "common_ref" in keypairs
        for e in keypairs["keypairs"]:
            assert "private_key" in e
            assert "public_key" in e
            assert "address" in e
            assert "bls_public_key" in e

        genesis = toml.load(conf.config["muta"]["genesis_template"])
        assert genesis["services"][1]["name"] == "metadata"
        payload = json.loads(genesis["services"][1]["payload"])
        payload["common_ref"] = keypairs["common_ref"]
        payload["timeout_gap"] = c_timeout_gap
        payload["cycles_limit"] = c_cycles_limit
        payload["tx_num_limit"] = c_tx_num_limit
        payload["verifier_list"] = []

        for i, e in enumerate(keypairs["keypairs"]):
            if i >= (len(face_config_list) - conf.config["muta"]["sync_node_number"]):
                break
            a = {
                "bls_pub_key":  e["bls_public_key"],
                "address": e["address"],
                "propose_weight": 1,
                "vote_weight": 1,
            }
            payload["verifier_list"].append(a)
        genesis["services"][1]["payload"] = json.dumps(payload)
        with open("./build/genesis.toml", "w") as f:
            toml.dump(genesis, f)

        node_config_raw = toml.load(conf.config["muta"]["config_template"])
        for i in range(len(face_config_list)):
            node_config = copy.deepcopy(node_config_raw)
            host_config = face_config_list[i]
            keypair = keypairs["keypairs"][i]
            node_config["privkey"] = keypair["private_key"]
            node_config["data_path"] = host_config["data"]
            node_config["graphql"]["listening_address"] = "0.0.0.0:" + str(host_config["api_port"])
            node_config["network"]["listening_address"] = "0.0.0.0:" + str(host_config["p2p_port"])
            node_config["logger"]["log_path"] = os.path.join(host_config["data"], "logs")
            node_config["mempool"]["pool_size"] = c_poolsize
            node_config["network"]["bootstraps"] = [{
                "pubkey": keypairs["keypairs"][0]["public_key"],
                "address": face_config_list[0]["host"] + ":" + str(face_config_list[0]["p2p_port"]),
            }]

            with open(f"./build/config_{i+1}.toml", "w") as f:
                toml.dump(node_config, f)
