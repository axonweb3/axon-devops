const config = require('./config.json')
const cron = require('node-cron');
const DiscordWebhook = require('./src/discord/discord_webhook')
const RepoInfo = require('./src/repo/repo_info')
process.env.TZ = 'Asia/Shanghai'
;(async function () {
		cron.schedule('30 09 * * *', async () => {
			try {
				const hours = new Date().getHours()
				if (hours > 19 || hours < 9) {
					return
				}
				const discord = new DiscordWebhook(config)
				for (const index in config.repos) {
					const repo_info = new RepoInfo(config.repos[index].onwer, config.repos[index].repo)
					const res = await repo_info.getPrInfos()
					await discord.sendPrInfos(res)
				}
			} catch (e) {
				console.log(e)
			}
		});
})()
