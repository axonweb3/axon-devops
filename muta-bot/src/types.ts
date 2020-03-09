export interface IssueMeta {
  kind: string;
  point: number;
  assignees: string[];
  reviewers: string[];
  milestone: string;
}

export interface IssueWithProject {
  projectID: number;
  cardID: number;
  column: number;
}

export interface LatestWeekly {
  number: number;
  id: number;
  node_id: string;
  last_number: number;
}
