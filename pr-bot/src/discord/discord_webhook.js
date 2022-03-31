const { MessageEmbed, WebhookClient } = require('discord.js')

class DiscordWebhook {
	constructor(config) {
		this.discord = new WebhookClient({ id: config.id, token: config.token })
	}

	async sendPrInfos(prInfos) {
		for (const index in prInfos) {
			const info = prInfos[index]
			const embed = new MessageEmbed().setTitle(info.title).setColor('#0099ff').addField('reviewers: ', `${info.reviewers}`).addField('owner: ', info.owner).setURL(info.link)

			await this.discord.send({
				content: ' ',
				username: 'request review',
				avatarURL: 'https://i.imgur.com/AfFp7pu.png',
				embeds: [embed],
			})
		}
	}
}

module.exports = DiscordWebhook
