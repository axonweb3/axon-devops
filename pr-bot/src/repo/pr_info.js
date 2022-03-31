class PrIfnfo {
	constructor(prInfo) {
		const requested_reviewers = []
		for (const idx in prInfo.requested_reviewers) {
			requested_reviewers.push(prInfo.requested_reviewers[idx].login)
		}

		this.title = prInfo.title
		this.owner = prInfo.user.login
		this.reviewers = requested_reviewers.length === 0 ? 'Please add reviewer' : requested_reviewers.join(', ')
		this.link = prInfo._links.html.href
	}
}

module.exports = PrIfnfo
