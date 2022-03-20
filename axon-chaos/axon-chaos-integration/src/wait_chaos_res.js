const fetch = require('node-fetch')
const sleep = require('./sleep')

class WaitChaosRes {

    constructor(url) {
        this.url = url
        this.events = []
        this.uid = ""
    }

    async wait() {
        let workflow = await this.get_workflow();
        this.uid = workflow.uid
        console.log(
            "############################################### chaos start ###############################################")
        while (workflow.status == "running") {
            const events = await this.get_events(workflow.uid)
            this.change_events(events)
            await sleep(5000)
            workflow = await this.get_workflow();
            if(this.uid != workflow.uid) {
                return false
            }
        }

        const tasks = await this.get_tasks_by_uid(workflow.uid)
        this.log_tasks(tasks)

        console.log(
            "############################################### chaos end ###############################################")

        return true
    }

    async get_tasks_by_uid(uid) {
        const response = await fetch(`${this.url}/api/workflows/${uid}`)
        const workflow = await response.json()
        return workflow.topology.nodes;
    }

    async get_workflow() {
        const response = await fetch(`${this.url}/api/workflows`)
        const workflows = await response.json()

        if (workflows.length < 1) {
            throw new Error("chaos not found")
        }

        return workflows[0]
    }

    async get_events(uid) {
        const response = await fetch(`${this.url}/api/events/workflow/${uid}`)
        return await response.json()
    }

    change_events(events) {
        for (const index in events) {
            if (!this.events.includes(events[index].id)) {
                this.events.push(events[index].id)
                this.log_event(events[index])
            }
        }

    }

    log_event(event) {
        console.log(`event: ${event.name}, event status: ${event.message}`);
    }

    log_tasks(tasks) {
        for (const index in tasks) {
            console.log(
                `task template: ${tasks[index].template}, task status: ${tasks[index].state}`);
        }
    }
}

module.exports = WaitChaosRes
