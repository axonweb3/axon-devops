const fs = require("fs");
const path = require("path");

describe("push handler works", () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.CI_CONFIG = "test/fixtures/ci.test.yml";
  });

  test("trigger ci when receive push event", async () => {
    const push = require("../src/push");
    const payload = {
      ref: "refs/heads/master",
      after: "8bc88ba8f9a6d3139272d6cb2466bdc14d8e0839",
      repository: {
        url: "https://github.com/npc/server"
      }
    };
    push.pushHandler(payload);
  });

  afterEach(() => {
    delete process.env.CI_CONFIG;
  });
});
