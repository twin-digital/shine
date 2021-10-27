import { Repository } from "@octokit/graphql-schema"
import { Octokit } from '@octokit/core'

/** Name and HEAD for a branch. */
export interface BranchRef {
  /** git OID of the branch's HEAD */
  head?: string

  /** name of this branch */
  name?: string
}

/**
 * Status information for the branches associated with a change request.
 */
export interface BranchStatus {
  /** 
   * ref information for the branch containing the change; will be undefined if the branch does not exist
   **/
  changeBranch?: BranchRef

  /** ref information for the repository's default branch, or undefined if none */
  defaultBranch?: BranchRef
}

/**
 * Retrieves the BranchStatus for a named branch in a repository.
 * 
 * @param owner repository owner
 * @param repositoryName repository name
 * @param branch name of the change branch of interest
 */
export const getBranchStatus = async (
  octokit: Octokit,
  owner: string, 
  repositoryName: string, 
  branch: string
): Promise<BranchStatus> => {
  type Result = Pick<Repository,
  'defaultBranchRef' |
  'id' |
  'pullRequests' |
  'ref'
  >

  const { repository } = await octokit.graphql<{ repository: Result }>(
    `
      query repoSummary (
        $configBranchQualifiedName: String!,
        $owner: String!, 
        $repo: String!
      ) { 
        repository (owner: $owner, name: $repo) { 
          id
          defaultBranchRef {
            name
            target {
              oid
            }
          }
          ref (qualifiedName: $configBranchQualifiedName) {
            id
            name
            target {
              oid
            }
          }
        }
      }
    `,
    {
      configBranchQualifiedName: `refs/heads/${branch}`,
      owner,
      repository: repositoryName,
    }
  )

  return {
    changeBranch: repository.ref === undefined || repository.ref === null ? undefined : {
      head: repository.ref.target?.oid,
      name: repository.ref.name,
    },
    defaultBranch: repository.defaultBranchRef === undefined || repository.defaultBranchRef === null ? undefined : {
      head: repository.defaultBranchRef.target?.oid,
      name: repository.defaultBranchRef.name,
    },
  }
}