import json
import random
from pprint import pprint
import sha3
from secp256k1 import PrivateKey, PublicKey
from jinja2 import Environment, FileSystemLoader
from pathlib import Path


HEX_LETTERS = '0123456789abcdef'
FILE_DIR = Path(__file__).parent
print(FILE_DIR)
env = Environment(loader=FileSystemLoader(str(FILE_DIR)))

def generate_keypair():
    private_key_hex = ''.join(random.choice(HEX_LETTERS) for _ in range(64))
    private_key = PrivateKey(bytes(bytearray.fromhex(private_key_hex)), raw=True)
    public_key = private_key.pubkey.serialize()
    address = '10' + sha3.keccak_256(public_key).digest().hex()[:40]
    return {
        'private_key': private_key_hex,
        'public_key': public_key.hex(),
        'address': address,
    }

def gen_chain_meta(keypairs):
    for i, keypair in enumerate(keypairs, 1):
        keypair['index'] = i
        ip_address = f'174.20.0.{i+100}'
        keypair['ip_address'] = ip_address
    data = {
        'keypairs': keypairs,
        'bootstraps': keypairs[0],
        'subnet': '174.20.0.0/24'
    }
    return data

def gen_config(chain_meta, path):
    config = env.get_template('config.toml.j2')
    for keypair in chain_meta['keypairs']:
        info = {
            'private_key': keypair['private_key'],
            'index': keypair['index'],
        }
        res = config.render(common=chain_meta, **info)
        # print(res)
        open(path / f'config-bft-{keypair["index"]}.toml', 'w').write(res)



def gen_docker_compose_config(chain_meta, path):
    docker_compose = env.get_template('docker-compose.yaml.j2')
    res = docker_compose.render(chain_meta)
    # print(res)
    open(path / 'docker-compose.yaml', 'w').write(res)

def gen_keypairs_yml(num):
    random.seed(0)
    keypairs = [generate_keypair() for _ in range(num)]
    keypairs = []
    for i in range(num):
        keypair = generate_keypair()
        keypair['index'] = i + 1
        keypair['ip_address'] = f"{'.'.join(subnet.split('.')[:-1])}.{i}"
        keypairs.append(keypair)
    pprint(keypairs)
    json.dump(keypairs, open(FILE_DIR / 'keypairs.json', 'w'), indent=4)


def gen_chain_meta_json(num=150, path=None):
    random.seed(0)
    subnet = '174.20.0.0/24'
    ip_prefix = '.'.join(subnet.split('.')[:-1])
    keypairs = []
    for i in range(1, num+1):
        keypair = generate_keypair()
        keypair['index'] = i
        keypair['ip_address'] = f'{ip_prefix}.{i+100}'
        keypairs.append(keypair)
    data = {
        'keypairs': keypairs,
        # 'bootstraps': keypairs[:1],
        'subnet': subnet
    }
    path = path or FILE_DIR
    json.dump(data, open(path / 'chain_meta.json', 'w'), indent=4)
    return data


def gen_all(path=None, num=4):
    random.seed(0)
    if not path:
        path = FILE_DIR / 'out'
    keypairs = [generate_keypair() for _ in range(num)]
    chain_meta = gen_chain_meta(keypairs)
    gen_docker_compose_config(chain_meta, path)
    gen_config(chain_meta, path)




if __name__ == "__main__":
    # n = 4
    # gen_keypairs_yml(n)
    # keypairs = [generate_keypair() for _ in range(n)]
    # chain_meta = gen_chain_meta(keypairs)
    # pprint(chain_mata)
    # gen_config(chain_meta)
    # gen_docker_compose_config(chain_meta)
    # gen_all(num=4)
    gen_chain_meta_json()
