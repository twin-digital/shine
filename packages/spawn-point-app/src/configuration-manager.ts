import { filter, flatten, flow, get, map } from 'lodash/fp'
import { ProbotOctokit } from 'probot'

import { SpawnPointConfig } from './configuration'
import { getTaskLists } from './markdown/task-lists'

const getConfigFromIssue = (body: string): SpawnPointConfig => {
  // todo: handle invalid body content

  const taskLists = getTaskLists(body)
  return {
    extends: [],
    facets: flow(
      map(get('items')),
      flatten,
      filter(get('checked')),
      map((item) => ({
        path: 'foo/bar',
        source: item.text,
        type: 'static-content',
      }))
    )(taskLists),
  }
}

export class ConfigurationManager {
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
      : getConfigFromIssue(issue.body)
  }
}
