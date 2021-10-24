import { filter, flow, get, isEmpty, map, reject } from 'lodash/fp'
import marked, { Token, Tokens } from 'marked'

/** Text label and checked status for one entry in a task list. */
export interface TaskListItem {
  /** whether the item was checked or not */
  checked: boolean

  /** label for this item */
  text: string
}

/** A list containing one or more items with checkboxes. */
export interface TaskList {
  /** set of items in this task list */
  items: TaskListItem[]
}

const listItemsToTaskList = (items: Tokens.ListItem[]) => {
  return {
    items: map((item) => ({
      checked: item.checked ?? false,
      text: item.text,
    }), items),
  }
}

/**
 * Given a markdown string, parse any Task Lists and return them. A task list is
 * a markdown list which contains one or more tasks. (That is, an item starting with a
 * checkbox -- `[ ]`.)
 */
export const getTaskLists = (markdown: string): TaskList[] => {
  const tokens = marked.lexer(markdown)

  return flow(
    filter((token: Token) => token.type === 'list'),
    map(get('items')),
    map(filter(get('task'))),
    reject(isEmpty),
    map(listItemsToTaskList)
  )(tokens)
}
