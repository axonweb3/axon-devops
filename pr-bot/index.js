const RepoInfo = require('./src/repo/repo_info');
const DiscordWebhook = require('./src/discord/discord_webhook');
const config = require('./config.json');

(async function () {
    setInterval(async () => {
        try {
            const hours = new Date().getHours();
            if (hours > 19 || hours < 9) {
                return;
            }

            const discord = new DiscordWebhook(config);
            for (const index in config.repos) {
                const repo_info = new RepoInfo(config.repos[index].onwer, config.repos[index].repo);
                const res = await repo_info.get_pr_info();
                await discord.send_pr_infos(res);
            }
        } catch (e) {
            console.log(e);
        }

    }, config.time_interval_for_notification * 60 * 1000);

})();
