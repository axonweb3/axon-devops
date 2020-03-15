import { Application, Context, Octokit } from "probot"; // eslint-disable-line no-unused-vars
import createScheduler from "probot-scheduler";
import moment from "moment";

import fileDB from "./db";
import * as config from "./config";

const PREVIEW_HEADER = "application/vnd.github.elektra-preview+json";

const WEEKLY_PROJECT = "Weekly-reports";
const WEEKLY_PROJECT_COLUMN_TODO = "To do";

const PROJECT_COLUMN_IN_PROGRESS = "In progress";
const PROJECT_COLUMN_IN_REVIEW = "In review";
const PROJECT_COLUMN_DONW = "Done";

const REPO_NAME = config.WEEKLY_REPO;

// GraphQL query to pin an issue
const pinissue = `mutation ($input: PinIssueInput!) {
  pinIssue(input: $input) {
    issue {
      title
    }
  }
}`;

// GraphQL query to unpin an issue
const unpinissue = `mutation ($input: UnpinIssueInput!) {
  unpinIssue(input: $input) {
    issue {
      title
    }
  }
}`;

interface ListCard {
  cardType: string;
  list: Octokit.ProjectsListCardsResponseItem[];
}

interface IssueMeta {
  title: string;
  assignees: string[];
  reviewers: string[];
  number: number;
  id: number;
  point: number;
}

interface TemplateData {
  progress: IssueMeta[];
  review: IssueMeta[];
  done: IssueMeta[];
  delay: IssueMeta[];
}

// const CURRENT_REPO = proce;
export default function(app) {
  createScheduler(app);
  app.on("schedule.repository", async (context: Context) => {
    // this event is triggered on an interval, which is 1 hr by default
    if (context.payload.repository.name !== REPO_NAME) {
      return;
    }

    if (!isWeekend()) {
      return;
    }

    const monday = moment().startOf("isoWeek");
    const sunday = moment().endOf("isoWeek");
    const title = `[Weekly-report] ${monday.format(
      "YYYY/MM/DD"
    )} ~ ${sunday.format("YYYY/MM/DD")}`;

    const latestWeekly = fileDB.getLatestWeeklyIssue();
    if (latestWeekly) {
      const { data: issue } = await context.github.issues.get(
        context.issue({
          issue_number: latestWeekly.number
        })
      );

      if (issue.title === title) {
        const mdRender = await getMDRender(context);

        await context.github.issues.update({
          issue_number: latestWeekly.number,
          body: mdRender,
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name
        });

        return;
      }
    }

    const mdRender = await getMDRender(context);

    if (latestWeekly) {
      try {
        await context.github.graphql(
          unpinissue,
          {
            input: {
              issueId: latestWeekly.node_id
            }
          },
          {
            Accept: PREVIEW_HEADER
          }
        );
      } catch (e) {
        console.error(e);
      }
    }

    const { data: issueRes } = await context.github.issues.create(
      context.issue({
        body: mdRender,
        labels: ["bot:weekly-report"],
        title
      })
    );

    await context.github.graphql(
      pinissue,
      {
        input: {
          issueId: issueRes.node_id
        }
      },
      {
        Accept: PREVIEW_HEADER
      }
    );
    await moveToWeeklyProject(context, issueRes.id);
    fileDB.saveLatestWeeklyIssue(
      issueRes.id,
      issueRes.number,
      issueRes.node_id,
      latestWeekly.number
    );

    await context.github.issues.update({
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      issue_number: latestWeekly.number,
      state: "closed"
    });
  });
}

async function getLatestProjectID(context: Context): Promise<number> {
  const {
    data: listMilestone
  } = await context.github.issues.listMilestonesForRepo(context.issue());
  const milestone = listMilestone[listMilestone.length - 1];

  const { data: projects } = await context.github.projects.listForRepo(
    context.issue()
  );

  const project = projects.find(p => p.name === milestone.title);
  if (!project) {
    throw new Error(`Not found project ${milestone.title}`);
  }
  return project.id;
}

async function listCardForProject(
  context: Context,
  id: number
): Promise<ListCard[]> {
  const { data: listColumn } = await context.github.projects.listColumns({
    project_id: id
  });

  const promiseAll = [
    PROJECT_COLUMN_IN_PROGRESS,
    PROJECT_COLUMN_IN_REVIEW,
    PROJECT_COLUMN_DONW
  ]
    .map(name => {
      return { column_id: findColumnID(listColumn, name), name };
    })
    .map(async ({ column_id, name }) => {
      const { data: listCards } = await context.github.projects.listCards({
        column_id,
        archived_state: "not_archived"
      });

      return { cardType: name, list: listCards.filter(c => c.content_url) };
    });

  return Promise.all(promiseAll);
}

function findColumnID(listColumn: any[], columnName: string): number {
  const column = listColumn.find(column => column.name === columnName);
  return column.id;
}

async function getListIssueMeta(
  context: Context,
  list: Octokit.ProjectsListCardsResponseItem[]
): Promise<IssueMeta[]> {
  const listIssue = await Promise.all(
    list.map(card => getIssue(context, card.content_url))
  );

  const listIssueMeta = listIssue.map(issue => {
    const point = issue.labels.find(l => l.name.startsWith("p"));
    const issueMeta = fileDB.getIssuesMeta(issue.id);
    let assignees: string[] = [];
    let reviewers: string[] = [];

    if (!issueMeta) {
      assignees = issue.assignees.map(user => user.login);
    } else {
      assignees = issueMeta.assignees;
      reviewers = issueMeta.reviewers;
    }

    return {
      title: issue.title,
      assignees: assignees,
      reviewers,
      number: issue.number,
      id: issue.id,
      point: point ? Number.parseInt(point.name.slice(1)) : 0
    };
  });

  return listIssueMeta;
}

async function getIssue(
  context: Context,
  contentURL: string
): Promise<Octokit.IssuesGetResponse> {
  const id = getIssueID(contentURL);
  const issue = await context.github.issues.get(context.issue({ number: id }));
  return issue.data;
}
function getIssueID(contentURL: string): number {
  const split = contentURL.split("/");
  return Number.parseInt(split[split.length - 1]);
}

function isWeekend(): boolean {
  const day = moment().format("E");
  return day === "6" || day === "7";
}

function isWeekIssue(issueData: string, sunday: moment.Moment): boolean {
  return (
    moment(issueData)
      .endOf("isoWeek")
      .unix() === sunday.unix()
  );
}

function taskToString(tasks: IssueMeta[]): string {
  if (tasks.length === 0) {
    return "Empty content\r\n";
  }

  return tasks
    .map(task => {
      return `- ${task.title} #${task.number} assignees: ${task.assignees
        .map(u => `@${u}`)
        .join(" ")} reviewers: ${task.reviewers.map(u => `@${u}`).join(" ")}`;
    })
    .sort()
    .join("\r\n");
}

async function moveToWeeklyProject(context: Context, id: number) {
  const projectID = await getWeklyProject(context);
  const { data: listColumn } = await context.github.projects.listColumns({
    project_id: projectID
  });

  const columnID = findColumnID(listColumn, WEEKLY_PROJECT_COLUMN_TODO);
  await context.github.projects.createCard({
    column_id: columnID,
    content_id: id,
    content_type: "Issue"
  });
}

async function getWeklyProject(context: Context): Promise<number> {
  const { data: projects } = await context.github.projects.listForRepo(
    context.issue()
  );
  const weeklyProject = projects.find(p => p.name === WEEKLY_PROJECT);
  if (!weeklyProject) {
    throw new Error(`Not found ${WEEKLY_PROJECT}`);
  }

  return weeklyProject.id;
}

async function getMDRender(context: Context): Promise<string> {
  const monday = moment().startOf("isoWeek");
  const sunday = moment().endOf("isoWeek");

  const {
    data: listMilestone
  } = await context.github.issues.listMilestonesForRepo(context.issue());
  const milestone = listMilestone[listMilestone.length - 1];

  const projectID = await getLatestProjectID(context);

  const listCards = await listCardForProject(context, projectID);

  const templateData: TemplateData = {
    progress: [],
    review: [],
    done: [],
    delay: []
  };

  for (const cards of listCards) {
    switch (cards.cardType) {
      case PROJECT_COLUMN_IN_PROGRESS:
        const listProgressIssueMeta = await getListIssueMeta(
          context,
          cards.list
        );
        templateData.progress = listProgressIssueMeta;
        break;
      case PROJECT_COLUMN_IN_REVIEW:
        const listReviewIssueMeta = await getListIssueMeta(context, cards.list);
        templateData.review = listReviewIssueMeta;
        break;
      case PROJECT_COLUMN_DONW:
        const listDoneIssueMeta = await getListIssueMeta(
          context,
          cards.list.filter(card => isWeekIssue(card.updated_at, sunday))
        );
        templateData.done = listDoneIssueMeta;
        break;
    }
  }

  const latestWeekly = fileDB.getLatestWeeklyIssue();

  const notReadyTask = templateData.progress.concat(templateData.review);
  const delayTasks = notReadyTask.filter(task => {
    let startAt = moment(fileDB.getIssueStartAt(task.number));

    for (let i = 0; i < task.point; i++) {
      startAt = startAt.add(1, "days");
      if (startAt.format("E") === "6" || startAt.format("E") === "7") {
        i--;
      }
    }
    const deadline = startAt;
    return deadline.unix() < monday.unix();
  });
  templateData.delay = delayTasks;

  const mdRender = `# Weekly Report\r\nCurrent milestones: [${
    milestone.title
  }](${milestone.url})\r\nLast report: ${
    latestWeekly ? "#" + latestWeekly.last_number : "This is the first report."
  }\r\n## In progress\r\n${taskToString(
    templateData.progress
  )}\r\n## In review\r\n${taskToString(
    templateData.review
  )}\r\n## Done\r\n${taskToString(
    templateData.done
  )}\r\n ## Delay\r\n${taskToString(templateData.delay)}`;

  return mdRender;
}
