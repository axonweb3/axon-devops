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

const LABEL_DELAY = "bot:delay";  // delay issue , not daily
const LABEL_DAILY_REPORT = "k:daily-report";
const DAILY_PROJECT = "Daily-reports";


export interface AllTasks {
  progress: IssueMeta[];
  review: IssueMeta[];
  done: IssueMeta[];
  daily: IssueMeta[];
  delayIssues: Octokit.IssuesGetResponse[];
}

const log = config.DEV_MODE ? (...p: any[]) => p : console.log

export default function (app) {
  createScheduler(app, {
    interval: 10 * 60 * 1000 // 10 minutes
  })

  app.on("schedule.repository", async (context: Context) => {
    // this event is triggered on an interval, which is in by default
    // set interval = 10 minutes
    if (context.payload.repository.name !== REPO_NAME) {
      return;
    }
    log('daily schedule')
    const timeStr = moment().format("HH:mm").substr(0, 4)
    const day = moment().format("E");
    let allTasks: AllTasks = {
      progress: [],
      review: [],
      done: [],
      daily: [],
      delayIssues: [],
    }

    log(timeStr)
    switch (timeStr) {
      case '08:0' : // 08:00 ~ 08:09
        log(timeStr)
        if (day == '7' || day == '1') {
          return
        }
        await getAllTasks(context, allTasks)
        await notifyReviewers(context, allTasks)
        await addDelayLabelForTasks(context, allTasks)
        await dailyReport(context, allTasks, true)
        await createTodayDailyIssue(context, allTasks)
        break

      case '10:0' : // 10:00 ~ 10:09
        log(timeStr)
        if (day == '7' || day == '1') {
          return
        }
        await getAllTasks(context, allTasks)
        await dailyReport(context, allTasks, true)
        break

      case '22:0' : // 22:00 ~ 22:09
        log(timeStr)
        if (day == '6' || day == '7') {
          return
        }
        await getAllTasks(context, allTasks)
        await createTodayDailyIssue(context, allTasks)
        await dailyReport(context, allTasks, false)
        break

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
    }
  }

  log('----allTasks.daily')
  log(allTasks.daily)
}

async function notifyReviewers(context: Context, allTasks: AllTasks) {
  log('notifyReviewers')
  // notify reviewers for in-review task
  for (const task of allTasks.review) {
    const assigneeString = task.assignees
      .map(s => {
        return `@${s}`;
      })
      .join("  ");

    const liveReviewers = fileDB.getIssueReviewers(task.id);

    const liveReviewerString = liveReviewers
      .map(s => {
        return `- @${s}`;
      })
      .join("\r\n");

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

async function dailyReport(context: Context, allTasks: AllTasks, isYesterday: boolean) {
  log('dailyReport')

  const latestDailyIssue = fileDB.getLatestDailyIssue()


  log('latestDailyIssue:')
  log(latestDailyIssue)

  let daily_issue_number = -1


  const date = isYesterday ? moment().add(-1, 'days') : moment()
  const title = `[Daily-Report] ${date.format("YYYY-MM-DD")}`

  if (!latestDailyIssue || latestDailyIssue.number == 0) {
    daily_issue_number = findDailyTask(title, allTasks)
  } else {
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

  if (issue.title > title) {
    return
  } else if (issue.title < title) {
    throw new Error(`daily report issue title wrong: ${issue.title}, should be ${title}`);
  }


  // yesterday daily report issue update
  if (isYesterday) {
    log('--daily report issue: ', issue.title, issue.number)
    const body = await getDailyReportText(context, allTasks)
    await context.github.issues.update({
      issue_number: daily_issue_number,
      body: body,
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name
    })
  }

  // notification to telegram channel
  // 1.report issue url remind
  // 2.members who have not yet updated daily report issue
  await remindDailyReportToTG(context, issue, isYesterday)
}

async function remindDailyReportToTG(context: Context, issue: Octokit.IssuesGetResponse, isYesterday: boolean) {
  let text: string
  if (!isYesterday) {
    text = `*${issue.title}* Start update\r\n${issue.html_url}\r\n`
  } else {
    const membersRemind = await getMembersRemind(context, issue)
    text = `*${issue.title}* Waiting for updates\r\n${issue.html_url}\r\n` + `${membersRemind}`
  }
  sendToTelegram(text)
}

async function getDailyReportText(context: Context, allTasks: AllTasks): Promise<string> {
  // 1.delay issues remind
  let text = "## Delay issues\r\n"
    + allTasks.delayIssues
      .map(issue => `- [#${issue.number + '  ' + issue.title}](${issue.html_url})`)
      .join('\r\n')

  if (text === "## Delay issues\r\n") {
    text = text + "- None"
  }

  log('----getDailyReportText', text)
  return text
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
