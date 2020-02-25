import os
import toml

if os.environ["CONFIG"]:
    config_path = f"./res/{os.environ['CONFIG']}.toml"
else:
    config_path = "./res/config.toml"
print("config path is", config_path)

with open("./res/secret.toml") as f:
    secret = toml.load(f)
with open(config_path) as f:
    config = toml.load(f)
