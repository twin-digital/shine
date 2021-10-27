import { FileChanges } from "@octokit/graphql-schema"

export interface RequestChangeOptions {
  /** name of the branch to submit the changes to */
  branchName: string

  /** changes to make to the repository */
  changes: FileChanges
}

export const requestChange = ({
  branchName,
  changes,
}: RequestChangeOptions) => {

}