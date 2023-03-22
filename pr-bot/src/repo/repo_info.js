const fetch = require('node-fetch')
const PrIfnfo = require('./pr_info')

class RepoInfo {
	constructor(owner, repo) {
		this.repo_url = `https://api.github.com/repos/${owner}/${repo}/pulls`
	}

	async getPrInfos() {
		const response = await fetch(this.repo_url)
		const prInfos = await response.json()

		const res = []
		for (const index in prInfos) {
			if (prInfos[index].draft == true) {
				continue
			}
			if (prInfos[index].user.login == 'dependabot[bot]') {
				continue
			}
			
			res.push(new PrIfnfo(prInfos[index]))
		}

		return res
	}
}

module.exports = RepoInfo
