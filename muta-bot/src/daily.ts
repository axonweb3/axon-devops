import {Application, Context, Octokit} from "probot"; // eslint-disable-line no-unused-vars
import createScheduler from "probot-scheduler";
import moment from "moment";
import fileDB from "./db";
import * as config from "./config"

import {
  WEEKLY_PROJECT_COLUMN_TODO,
  PROJECT_COLUMN_IN_PROGRESS, PROJECT_COLUMN_IN_REVIEW, PROJECT_COLUMN_DONE,
  ListCard, listCardForProject, getListIssueMeta, IssueMeta, findColumnID, REPO_NAME
} from './weekly'

import sendToTelegram from './notification'
import {WEEKLY_MEETING_URL, WEEKLY_MEETING_URL_FRIDAY} from "./config";

const LABEL_DELAY = "bot:delay";  // delay issue , not daily
const LABEL_DAILY_REPORT = "k:daily-report";
const DAILY_PROJECT = "Daily-reports";

const dailyScheduleTimes = ['08:0', '10:0', '20:0']
const weeklyScheduleTimes = ['09:3', '16:3'] // weekly meeting

export interface AllTasks {
  progress: IssueMeta[];
  review: IssueMeta[];
  done: IssueMeta[];
  daily: IssueMeta[];
  delayIssues: Octokit.IssuesGetResponse[];
}

//const log = config.DEV_MODE ? console.log : (...p: any[]) => p
const log = console.log

export default function (app) {
  createScheduler(app, {
    interval: 10 * 60 * 1000 // 10 minutes
    // interval: 2 * 60 * 1000 // 1 minutes
  })

  app.on("schedule.repository", async (context: Context) => {
    // this event is triggered on an interval, which is in by default
    // set interval = 10 minutes
    if (context.payload.repository.name !== REPO_NAME) {
      return;
    }
    log('daily schedule')
    const timeStrAll = moment().format("HH:mm")
    const timeStr = timeStrAll.substr(0, 4)
    const day = moment().format("E");
    let allTasks: AllTasks = {
      progress: [],
      review: [],
      done: [],
      daily: [],
      delayIssues: [],
    }

    let yesterdayDaily, todayDaily
    log(timeStr, timeStrAll)

    // scheduleTimes = ['08:0', '10:0', '20:0']
    switch (timeStr) {
      // daily schedules
      case dailyScheduleTimes[0] : // 08:00 ~ 08:09
        if (day == '7' || day == '1') {
          return
        }
        await getAllTasks(context, allTasks)
        await notifyReviewers(context, allTasks)
        await addDelayLabelForTasks(context, allTasks)
        yesterdayDaily = await getDailyIssue(context, allTasks, true)
        if (!checkValidDaily(yesterdayDaily, true)) {
          return
        }
        // list all delay issues in daily issue body
        await updateDailyIssue(context, allTasks, yesterdayDaily)
        await remindDailyReportToTG(context, yesterdayDaily, timeStr)
        await createTodayDailyIssue(context, allTasks)
        break

      case dailyScheduleTimes[1] : // 10:00 ~ 10:09
        if (day == '7' || day == '1') {
          return
        }
        await getAllTasks(context, allTasks)
        yesterdayDaily = await getDailyIssue(context, allTasks, true)
        if (!checkValidDaily(yesterdayDaily, true)) {
          return
        }
        await remindDailyReportToTG(context, yesterdayDaily, timeStr)

        if (day == '6') {
          await weeklyAllDutyRedPocket(context, allTasks)
        }
        break

      case dailyScheduleTimes[2] : // 20:00 ~ 20:09
        if (day == '6' || day == '7') {
          return
        }
        await getAllTasks(context, allTasks)
        await createTodayDailyIssue(context, allTasks)

        todayDaily = await getDailyIssue(context, allTasks, false)
        if (!checkValidDaily(todayDaily, false)) {
          return
        }

        await remindDailyReportToTG(context, todayDaily, timeStr)
        break

      // weekly schedules
      // case weeklyScheduleTimes[0]:  // 09:30 Monday, prepare for the weekly meeting
      //   if (day !== '1') {
      //     return
      //   }
      //   await remindDailyReportToTG(context, todayDaily, timeStr)
      //   break
      //
      // case weeklyScheduleTimes[1]:  // 16:30 Friday, prepare for the weekly meeting
      //   if (day !== '5') {
      //     return
      //   }
      //   await remindDailyReportToTG(context, todayDaily, timeStr)
      //   break

      default:
        return
    }
  })
}

async function getAllTasks(context: Context, allTasks: AllTasks) {
  log('getAllTasks')
  const {data: projects} = await context.github.projects.listForRepo(
    context.issue()
  );

  for (const project of projects) {
    log(project.id, project.state, project.name)
    const id = project.id
    if (project.state in [WEEKLY_PROJECT_COLUMN_TODO, PROJECT_COLUMN_DONE]) {
      continue
    }

    const listCards = await listCardForProject(context, id);

    await listCardsToAllTasks(context, listCards, allTasks, project.name === DAILY_PROJECT)
  }
}

async function listCardsToAllTasks(context: Context, listCards: ListCard[], allTasks: AllTasks, isDailyProject: boolean) {
  log('--listCardsToAllTasks')

  for (const cards of listCards) {
    switch (cards.cardType) {
      case PROJECT_COLUMN_IN_PROGRESS:
        const listProgressIssueMeta = await getListIssueMeta(context, cards.list);
        if (isDailyProject) {
          allTasks.daily = allTasks.daily.concat(listProgressIssueMeta);
        } else {
          allTasks.progress = allTasks.progress.concat(listProgressIssueMeta);
        }
        break;

      case PROJECT_COLUMN_IN_REVIEW:
        const listReviewIssueMeta = await getListIssueMeta(context, cards.list);
        allTasks.review = allTasks.review.concat(listReviewIssueMeta);
        break;

      case PROJECT_COLUMN_DONE:
        const listDoneIssueMeta = await getListIssueMeta(context, cards.list);
        if (isDailyProject) {
          allTasks.daily = allTasks.daily.concat(listDoneIssueMeta);
        } else {
          allTasks.done = allTasks.done.concat(listDoneIssueMeta);
        }
        break;
    }
  }

  log('----allTasks.daily')
  log(allTasks.daily)
}

async function notifyReviewers(context: Context, allTasks: AllTasks) {
  log('notifyReviewers')

  log('--review tasks:')
  // notify reviewers for in-review task
  for (const task of allTasks.review) {
    const assigneeString = task.assignees
      .map(s => {
        return `@${s}`;
      })
      .join("  ");

    const liveReviewers = fileDB.getIssueReviewers(task.id);

    const liveReviewerString = liveReviewers ?
      liveReviewers.map(s => {
        return `- @${s}`;
      })
        .join("\r\n")
      : "";

    log('task:', task.title, '  liveReviewerString:', liveReviewerString)
    if (liveReviewerString == '') {
      continue
    }

    await context.github.issues.createComment(
      context.issue({
        issue_number: task.number,
        body: `${assigneeString} \r\n\r\n Waiting For Reviewers:\r\n${liveReviewerString}`
      })
    );
  }
}

async function addDelayLabelForTasks(context: Context, allTasks: AllTasks) {
  log('addDelayLabelForTasks')
  log("--localTime:" + moment())

  const localTimestamp = moment().unix()

  // add delay label for delay tasks
  const notReadyTask = allTasks.progress.concat(allTasks.review);
  const delayTasks = notReadyTask.filter(task => {
    let startAt = moment(fileDB.getIssueStartAt(task.id));

    log(task.number, task.id, task.title, startAt)

    for (let i = 0; i < task.point; i++) {
      startAt = startAt.add(1, "days");
      if (startAt.format("E") === "6" || startAt.format("E") === "7") {
        i--;
      }
    }
    const deadline = startAt;
    return deadline.unix() < localTimestamp;
  });

  for (const task of delayTasks) {
    const {data: issue} = await context.github.issues.get(
      context.issue({
        issue_number: task.number
      })
    );
    allTasks.delayIssues.push(issue)
    const labels = issue.labels.map(l => l.name)
    if (LABEL_DELAY in labels) {
      continue
    }
    labels.push(LABEL_DELAY)
    await context.github.issues.update(
      context.issue({
        issue_number: task.number,
        labels: labels
      })
    );
  }

}

async function getDailyIssue(
  context: Context,
  allTasks: AllTasks,
  isYesterday: boolean
): Promise<Octokit.IssuesGetResponse> {
  log('getDailyIssue')

  const latestDailyIssue = fileDB.getLatestDailyIssue()

  log('--latestDailyIssue:')
  log(latestDailyIssue)

  const date = isYesterday ? moment().add(-1, 'days') : moment()
  const title = `[Daily-Report] ${date.format("YYYY-MM-DD")}`

  let daily_issue_number = findDailyTask(title, allTasks)

  if (daily_issue_number < 0 && latestDailyIssue) {
    daily_issue_number = latestDailyIssue.number
  }

  if (daily_issue_number < 0) {
    throw new Error(`Not found daily report issue ${title}`);
  }

  const {data: issue} = await context.github.issues.get(
    context.issue({
      issue_number: daily_issue_number
    })
  );
  return issue
}

function checkValidDaily(issue: Octokit.IssuesGetResponse, isYesterday: boolean): boolean {
  if (!issue.title.startsWith('[Daily-Report]')) {
    throw new Error(`daily report issue title not valid, found ${issue.title}`);
  }

  const date = isYesterday ? moment().add(-1, 'days') : moment()
  const title = `[Daily-Report] ${date.format("YYYY-MM-DD")}`

  if (issue.title > title) {
    return false
  } else if (issue.title < title) {
    throw new Error(`daily report issue title wrong: ${issue.title}, should be ${title}`);
  }
  return true
}

async function updateDailyIssue(context: Context, allTasks: AllTasks, issue: Octokit.IssuesGetResponse) {
  log('updateDailyIssue: ', issue.title, issue.number)
  const body = await getDailyReportText(context, allTasks)
  await context.github.issues.update({
    issue_number: issue.number,
    body: body,
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name
  })
}

function getIssueUrl(issue_number: number) {
  return "https://github.com/nervosnetwork/muta-internal/issues/" + issue_number
}

async function getDailyReportText(context: Context, allTasks: AllTasks): Promise<string> {
  let text: string

  const monday = moment().startOf("isoWeek")
  const today = moment()
  const startTitle = `[Daily-Report] ${monday.format("YYYY-MM-DD")}`
  const todayTitle = `[Daily-Report] ${today.format("YYYY-MM-DD")}`

  // 1.daily issue list in this week
  text = `## Daily reports this week\r\n`
    + allTasks.daily.filter(item =>
      item.title >= startTitle && item.title < todayTitle
    ).sort((a: IssueMeta, b: IssueMeta) => a.number - b.number
    ).map(task => `- [${task.title}](${getIssueUrl(task.number)})`
    ).join('\r\n')
    + '\r\n'


  // 2.delay issues remind
  text += "## Delay issues\r\n"
    + allTasks.delayIssues
      .map(issue => `- [#${issue.number + '  ' + issue.title}](${issue.html_url})`)
      .join('\r\n')

  if (allTasks.delayIssues.length == 0) {
    text = text + "- None"
  }

  log('----getDailyReportText')
  log(text)
  return text
}

async function remindDailyReportToTG(context: Context, issue: Octokit.IssuesGetResponse, timeStr: string) {
  log('remindDailyReportToTG', timeStr)
  let text, membersRemind: string

  switch (timeStr) {
    // daily schedules
    case dailyScheduleTimes[0]:  // 08:00
      membersRemind = await getMembersRemind(context, issue)
      text = `*${issue.title}* Waiting for updates\r\n${issue.html_url}\r\n` + `${membersRemind}`
      break

    case dailyScheduleTimes[1]:  // 10:00
      membersRemind = await getMembersRemind(context, issue)
      if (membersRemind === '') {
        text = `*${issue.title}  Time out* \r\n${issue.html_url}\r\n`
          + `*Congratulations! No one was late*\r\n`
      } else {
        text = `*${issue.title}  Time out* \r\n${issue.html_url}\r\n`
          + `${membersRemind}\r\n`
          + `*You know what you have to do, right?*\r\n`
          + `${config.RED_POCKET_ADDRESS}`
      }
      break

    case dailyScheduleTimes[2]:  // 20:00`
      text = `*${issue.title}* Start update\r\n${issue.html_url}\r\n`
      break


    // weekly schedules
    case weeklyScheduleTimes[0]:
      text = `Weekly meeting is about to begin, please get ready\r\n` +
        `${WEEKLY_MEETING_URL.replace('_', '\\_')}`
      break

    case weeklyScheduleTimes[1]:
      text = `Weekly meeting is about to begin, please get ready\r\n` +
        `${WEEKLY_MEETING_URL_FRIDAY.replace('_', '\\_')}`
      break

    default:
      return
  }

  await sendToTelegram(text)
}

function findDailyTask(title: string, allTasks: AllTasks): number {
  for (const task of allTasks.daily) {
    if (task.title == title) {
      return task.number
    }
  }
  return -1
}

async function createTodayDailyIssue(context: Context, allTasks: AllTasks) {
  const today = moment()
  if (today.format("E") == '6' || today.format("E") == '7') {
    return
  }

  const title = `[Daily-Report] ${today.format("YYYY-MM-DD")}`

  log('createTodayDailyIssue:', title)

  const issuer_number = findDailyTask(title, allTasks)
  if (issuer_number > -1) {
    return
  }

  const {data: issueRes} = await context.github.issues.create(
    context.issue({
      body: `**Done**:\r\n\r\n**Todo**:\r\n\r\n**Problem**:`,
      labels: [LABEL_DAILY_REPORT],
      title: title
    })
  );

  log('--created!', issueRes.html_url)

  await moveToDailyProject(context, issueRes.id)
  fileDB.saveLatestDailyIssue(
    issueRes.id,
    issueRes.number,
    issueRes.node_id,
    -1,
  )
}

async function getDailyProject(context: Context) {
  const {data: projects} = await context.github.projects.listForRepo(
    context.issue()
  );

  const dailyProject = projects.find(p => p.name === DAILY_PROJECT);
  if (!dailyProject) {
    throw new Error(`Not found ${DAILY_PROJECT}`);
  }
  return dailyProject.id;
}

async function moveToDailyProject(context: Context, id: number) {
  const projectID = await getDailyProject(context);
  const {data: listColumn} = await context.github.projects.listColumns({
    project_id: projectID
  });

  const columnID = findColumnID(listColumn, PROJECT_COLUMN_IN_PROGRESS);
  await context.github.projects.createCard({
    column_id: columnID,
    content_id: id,
    content_type: "Issue"
  });
}

async function getMembersRemind(context: Context, daily_issue: Octokit.IssuesGetResponse): Promise<string> {
  const {data: listComments} = await context.github.issues.listComments(
    context.issue({
      issue_number: daily_issue.number
    })
  )

  let hashCommented: { [index: string]: boolean } = {}

  for (const comment of listComments) {
    hashCommented[comment.user.login] = true
  }

  return config.MEMBERS.filter(item => {
    return !hashCommented[item['github']]
  })
    .map(s => `- @${s['telegram'] ? s['telegram'] : s['github']}`)
    .join('\r\n')
}

async function weeklyAllDutyRedPocket(context: Context, allTasks: AllTasks) {
  log('weeklyAllDutyRedPocket')
  const monday = moment().startOf("isoWeek")
  const today = moment()
  const startTitle = `[Daily-Report] ${monday.format("YYYY-MM-DD")}`
  const todayTitle = `[Daily-Report] ${today.format("YYYY-MM-DD")}`

  // 1.daily issue list in this week
  const tasks = allTasks.daily.filter(item =>
    item.title >= startTitle && item.title < todayTitle
  ).sort((a: IssueMeta, b: IssueMeta) => a.number - b.number
  )

  console.log(tasks)

  for (const task of tasks) {
    if (await someoneLate(context, task)) {
      return
    }
  }

  // All duty this week
  const text = `*Wow, no one was late in daily reports of this week!*\r\n`
    + tasks.map(task => `- [Daily-Report ${task.title.substring(15)}](${getIssueUrl(task.number)})\r\n`)
    + `*Let boss gives red pockets to everyone*\r\n`
    + `@${config.MEMBERS[0].github}\r\n`
    + `${config.RED_POCKET_ADDRESS}`

  await sendToTelegram(text)
}

async function someoneLate(context: Context, task: IssueMeta): Promise<boolean> {

  const {data: listComments} = await context.github.issues.listComments(
    context.issue({
      issue_number: task.number
    })
  )

  let hashCommented: { [index: string]: boolean } = {}
  const deadline = moment(task.title.substring(15)).add(1, 'days').add(10, 'hours')

  for (const comment of listComments) {
    if (moment(comment.created_at) <= deadline) {
      hashCommented[comment.user.login] = true
    }
  }
  log(deadline.format("YYYY-MM-DD HH:mm"))
  log('late people cnt: ', config.MEMBERS.filter(item => !hashCommented[item['github']]).length)
  return config.MEMBERS.filter(item => !hashCommented[item['github']]).length > 0
}
