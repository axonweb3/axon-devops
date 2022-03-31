
class PrIfnfo {

    constructor(pr_info) {
        const requested_reviewers = [];
        for (const idx in pr_info.requested_reviewers) {
            requested_reviewers.push(pr_info.requested_reviewers[idx].login);
        }

        this.title = pr_info.title;
        this.owner = pr_info.user.login;
        this.reviewers = requested_reviewers.length === 0 ? 'Please add reviewer' : requested_reviewers.join(', ');
        this.link = pr_info._links.html.href;
    }

}

module.exports = PrIfnfo;
