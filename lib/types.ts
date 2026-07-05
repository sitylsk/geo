export interface Submission {
  id: string;
  createdAt: string;

  name: string;
  email: string;

  projectName: string;
  tagline: string;
  githubUrl: string;
  /** Optional live deployment link, e.g. a Vercel URL. */
  liveUrl?: string;

  // public URLs to the 3 on-device screenshots
  screenshots: string[];
}

export interface NewSubmissionInput {
  name: string;
  email: string;
  projectName: string;
  tagline: string;
  githubUrl: string;
  liveUrl?: string;
  // data URLs (base64) coming from the browser
  screenshots: string[];
}
