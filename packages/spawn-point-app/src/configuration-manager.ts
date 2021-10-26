import { CreateCommitOnBranchInput, CreateRefInput, Repository } from '@octokit/graphql-schema'
import { filter, flow, get, isEmpty, map } from 'lodash/fp'
import { ProbotOctokit } from 'probot'

import { SpawnPointConfig } from './configuration'
import { parse } from './markdown-form/markdown-form'

/** default name of the branch used to submit configuration changes */
const DEFAULT_CONFIG_CHANGE_REQUEST_BRANCH = 'spawn-point/configuration'

interface ConfigurationChangeRequestStatus {
  /** name of the repository default branch */
  defaultBranch: { head?: string; name: string }

  /** node ID of the repository */
  repositoryId: string

  /** details about the configuration branch, if one exists */
  configBranch?: {
    /** sha of the head of the branch's current head */
    head: string

    /** node id of the config branch */
    id: string
  }

  /** PR number for the configuration pull request, if one exists */
  configPrNumber?: number
}

export const getConfigFromMarkdown = (body: string): SpawnPointConfig => {
  // todo: handle invalid body content

  const form = parse(body)

  return {
    extends: [],
    facets: flow(
      filter(get('value')),
      map((item) => ({
        path: 'foo/bar',
        source: item.id,
        type: 'static-content',
      }))
    )(form.fields),
  }
}

export class ConfigurationManager {
  private _changeRequestBranchName = DEFAULT_CONFIG_CHANGE_REQUEST_BRANCH

  constructor (
    private _octokit: InstanceType<typeof ProbotOctokit>,
    private _repo: { owner: string; repo: string }
  ) { /* noop */ }

  /**
   * Gets the configuration currently active in the repository's default branch.
   */
  public async getActiveConfig (): Promise<SpawnPointConfig> {
    // todo
    return {
      extends: [],
      facets: [],
    }
  }

  /**
   * Gets the configuration requested via the 'Configure Repository' issue. If there is no configuration issue, or if
   * the configuration issue has been closed, this method will return undefined.
   */
  public async getRequestedConfig (): Promise<SpawnPointConfig | undefined> {
    // todo: do not reload issue if we got it from the webhook handler

    const [issue] = (await this._octokit.issues.listForRepo({
      ...this._repo,
      creator: 'spawn-point[bot]',
      state: 'open',
    })).data

    return issue === undefined || issue.body === null || issue.body === undefined
      ? undefined
      : getConfigFromMarkdown(issue.body)
  }

  /**
   * Updates the Spawn Point configuration PR. It the requested config matches the actual config, then any
   * open PR for configuration is closed. If there is a mismatch between the requestd and acutal configs, then a config
   * PR is created or upated as needed.
   */
  public async updateConfigurationChangePr () {
    const changeRequestStatus = await this._getConfigurationChangeRequestStatus()

    let configBranchHead: string | undefined

    if (changeRequestStatus.configBranch === undefined) {
      if (changeRequestStatus.defaultBranch.head === undefined) {
        throw Error('Could not update configuration: HEAD of default branch was not found')
      }

      this._createConfigurationChangeBranch(
        changeRequestStatus.repositoryId,
        changeRequestStatus.defaultBranch.head
      )

      configBranchHead = changeRequestStatus.defaultBranch.head
    } else {
      configBranchHead = changeRequestStatus.configBranch.head
    }

    if (configBranchHead === undefined) {
      throw Error('Could not update configuration: HEAD of configuration branch was not found')
    }

    await this._commitNewConfiguration(configBranchHead)
  }

  /**
   * Creates a new configuration change branch.
   *
   * @param repositoryId node ID of the repository to contain the branch
   * @param commitSha git OID (i.e. sha) of the commit the branch should point to
   */
  private async _createConfigurationChangeBranch (repositoryId: string, commitSha: string) {
    const createBranchArgs: CreateRefInput = {
      name: `refs/heads/${this._changeRequestBranchName}`,
      oid: commitSha,
      repositoryId: repositoryId,
    }

    await this._octokit.graphql(`
      mutation createConfigBranch ($createBranchArgs: CreateRefInput!) {
        createRef (input: $createBranchArgs) {
          ref {
            name
          }
        }
      }
    `, {
      createBranchArgs,
    })
  }

  /** Commit new configuration, handling stale data errors */
  private async _commitNewConfiguration (configBranchHead: string) {
    /** # of times we will repull the head before giving up */
    const MAX_ATTEMPTS = 5
    let attempt = 0
    let head = configBranchHead
    let success = false
    do {
      try {
        await this._tryCommitNewConfiguration(head)
        success = true
      } catch (err: any) {
        console.log('cauth:', err.message)
        if (err.errors?.length === 1 && err.errors?.[0]?.type === 'STALE_DATA') {
          // retry, because someone else pushed to the branch
          const { repository } = await this._octokit.graphql<{ repository: Pick<Repository, 'ref'> }>(
            `
              query repoSummary (
                $configBranchQualifiedName: String!,
                $owner: String!, 
                $repo: String!
              ) { 
                repository (owner: $owner, name: $repo) { 
                  ref (qualifiedName: $configBranchQualifiedName) {
                    target {
                      oid
                    }
                  }
                }
              }
            `,
            {
              configBranchQualifiedName: `refs/heads/${this._changeRequestBranchName}`,
              owner: this._repo.owner,
              repo: this._repo.repo,
            }
          )

          if (repository.ref?.target?.oid === null) {
            throw Error('Could not update configuration: HEAD of configuration branch was not found')
          }

          head = repository.ref?.target?.oid
          console.log('RETYRING AT:', head)
        } else {
          // any type of error we just propagate
          throw err
        }
      }
    } while (!success && ++attempt < MAX_ATTEMPTS)

    if (!success) {
      throw Error('Could not update configuration: too many concurrent changes')
    }
  }

  /** Try to commit new configuration */
  private async _tryCommitNewConfiguration (configBranchHead: string) {
    const createCommitArgs: CreateCommitOnBranchInput = {
      branch: {
        repositoryNameWithOwner: `${this._repo.owner}/${this._repo.repo}`,
        branchName: this._changeRequestBranchName,
      },
      expectedHeadOid: configBranchHead,
      fileChanges: {
        additions: [
          {
            path: '.github/spawn-point.json',
            contents: Buffer.from(JSON.stringify(await this.getRequestedConfig(), null, 2)).toString('base64'),
          },
        ],
      },
      message: {
        headline: 'Update Spawn Point configuration.',
      },
    }

    await this._octokit.graphql(`
      mutation commitConfiguration ($createCommitArgs: CreateCommitOnBranchInput!) {
        createCommitOnBranch (input: $createCommitArgs) {
          commit {
            oid
          }
        }
      }
    `, {
      createCommitArgs,
    })
  }

  /** Gets the status of any exist configuration change request objects, such as branches and PRs */
  private async _getConfigurationChangeRequestStatus (): Promise<ConfigurationChangeRequestStatus> {
    type Result = Pick<Repository,
    'defaultBranchRef' |
    'id' |
    'pullRequests' |
    'ref'
    >

    const { repository } = await this._octokit.graphql<{ repository: Result }>(
      `
        query repoSummary (
          $configBranchName: String!,
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
              target {
                oid
              }
            }
            pullRequests (first: 1, headRefName: $configBranchName, states: [OPEN]) {
              nodes {
                number
              }
            }
          }
        }
      `,
      {
        configBranchName: this._changeRequestBranchName,
        configBranchQualifiedName: `refs/heads/${this._changeRequestBranchName}`,
        owner: this._repo.owner,
        repo: this._repo.repo,
      }
    )

    // if we somehow have no ref, point us at the default branch head
    const configBranchHead = !isEmpty(repository.ref?.target?.oid)
      ? repository.ref?.target?.oid
      : repository.defaultBranchRef?.target?.oid

    return {
      defaultBranch: {
        head: repository.defaultBranchRef?.target?.oid,
        name: repository.defaultBranchRef?.name ?? 'main',
      },
      repositoryId: repository.id,
      configBranch: repository.ref === undefined || repository.ref === null ? undefined : {
        head: configBranchHead,
        id: repository.ref.id,
      },
      configPrNumber: repository.pullRequests.nodes?.[0]?.number,
    }
  }
}
