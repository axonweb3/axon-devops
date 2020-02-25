import json
import os

import conf


class Acdb:

    def __init__(self, path):
        self.path = path
        os.makedirs(self.path, exist_ok=True)

    def save(self, k, v):
        with open(os.path.join(self.path, k + ".json"), "w") as f:
            json.dump(v, f, indent=4)

    def load(self, k):
        with open(os.path.join(self.path, k + ".json"), "r") as f:
            return json.load(f)

    def load_or(self, k, default):
        try:
            return self.load(k)
        except:
            return default

    def delete(self, k):
        os.remove(os.path.join(self.path, k+".json"))


db = Acdb(conf.config["db"]["path"])
