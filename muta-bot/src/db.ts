import path from "path";
import low from "lowdb";
import FileSync from "lowdb/adapters/FileSync";

import * as config from "./config";

import {IssueMeta, IssueWithProject, LatestWeekly} from "./types";

class FileDB {
  private db: low.LowdbSync<any>;

  constructor(file: string) {
    const adapter = new FileSync(file);
    const db = low(adapter);

    db.defaults({
      issue_meta: {},
      issue_with_project: {},
      issue_reviewers: {},
      issue_start_at: {},
      latest_weekly_issue: {
        number: 0,
        id: 0,
        node_id: "",
        last_number: 0
      }
    }).write();

    this.db = db;
  }

  public saveIssueStartAt(id: number, start_at: number) {
    this.db.set(`issue_start_at.${id}`, start_at).write();
  }

  public getIssueStartAt(id: number): number {
    return this.db.get(`issue_start_at.${id}`).value();
  }

  public saveIssuesMeta(id: number, meta: IssueMeta) {
    this.db.set(`issue_meta.${id}`, meta).write();
  }

  public getIssuesMeta(id: number): IssueMeta {
    return this.db.get(`issue_meta.${id}`).value();
  }

  public saveIssueWithProject(id: number, info: IssueWithProject) {
    this.db.set(`issue_with_project.${id}`, info).write();
  }

  public getIssueWithProject(id: number): IssueWithProject {
    return this.db.get(`issue_with_project.${id}`).value();
  }

  public saveIssueReviewers(id: number, reviewers: string[]) {
    this.db.set(`issue_reviewers.${id}`, reviewers).write();
  }

  public getIssueReviewers(id: number): string[] {
    return this.db.get(`issue_reviewers.${id}`).value();
  }

  public saveLatestWeeklyIssue(
    id: number,
    number: number,
    node_id: string,
    last_number: number
  ) {
    this.db
      .set("latest_weekly_issue", {
        id,
        number,
        node_id,
        last_number
      })
      .write();
  }

  public getLatestWeeklyIssue(): LatestWeekly {
    return this.db.get("latest_weekly_issue").value();
  }

  public saveLatestDailyIssue(
    id: number,
    number: number,
    node_id: string,
    last_number: number
  ) {
    this.db
      .set("latest_daily_issue", {
        id,
        number,
        node_id,
        last_number
      })
      .write();
  }

  public getLatestDailyIssue(): LatestWeekly {
    return this.db.get("latest_daily_issue").value();
  }
}

const dbFile = path.join(config.ROOT_PATH, "db.json");
const fileDB = new FileDB(dbFile);
console.log(`The data file of ${dbFile}`);
export default fileDB;
