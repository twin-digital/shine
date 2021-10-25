import { flow, get, map, reduce } from 'lodash/fp'
import { ProbotOctokit } from 'probot'

import { getTaskLists } from '../markdown/task-lists'

import { MarkdownConfig } from './types'

/**
 * Implementation of a configuration source that stores configuration values in the Markdown body of a GitHub object,
 * such as an issue or pull request.
 *
 * @param octokit Octokit instance for accessing the repository
 * @return the markdown content of the config object, or undefined if the source does not exist
 */
export type MarkdownConfigSource = (octokit: InstanceType<typeof ProbotOctokit>) => Promise<string | undefined>

/**
 * Gets the configuration requested via the 'Configure Repository' issue. If there is no configuration issue, or if
 * the configuration issue has been closed, this method will return undefined.
 */
export const parseConfig = (config: string) => {
  const taskLists = getTaskLists(config)
  return {
    exists: true,
    optionGroups: flow(
      map(get('items')),
      map((items) => ({
        values: reduce((result, item) => ({
          ...result,
          [item.text]: item.checked,
        }), {}, items),
      }))
    )(taskLists),
  }
}

/**
 * Parses the content of the specified configuration source, and returns the parsed config data.
 */
export const readConfig = (
  source: MarkdownConfigSource
) => async (octokit: InstanceType<typeof ProbotOctokit>): Promise<MarkdownConfig> => {
  const content = await source(octokit)

  return content === undefined
    ? { exists: false, optionGroups: [] }
    : parseConfig(content)
}
