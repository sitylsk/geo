export type ParticipationMode = "solo" | "team";

export interface TeamMember {
  name: string;
  email: string;
}

export interface Submission {
  id: string;
  createdAt: string;

  mode: ParticipationMode;

  // primary submitter
  name: string;
  email: string;

  // team-only
  teamName?: string;
  teammates?: TeamMember[];

  projectName: string;
  tagline: string;
  githubUrl: string;

  // relative public paths to the 3 on-device screenshots
  screenshots: string[];
}

export interface NewSubmissionInput {
  mode: ParticipationMode;
  name: string;
  email: string;
  teamName?: string;
  teammates?: TeamMember[];
  projectName: string;
  tagline: string;
  githubUrl: string;
  // data URLs (base64) coming from the browser
  screenshots: string[];
}
