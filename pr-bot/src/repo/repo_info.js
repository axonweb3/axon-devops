const fetch = require('node-fetch');
const PrIfnfo = require('./pr_info');

class RepoInfo {

    constructor(owner, repo) {
        this.repo_url = `https://api.github.com/repos/${owner}/${repo}/pulls`;
    }

    async get_pr_info() {
        const response = await fetch(this.repo_url);
        const pr_infos = await response.json();

        const res = [];
        for (const index in pr_infos) {
            res.push(new PrIfnfo(pr_infos[index]));
        }

        return res;
    }

}

module.exports = RepoInfo;
