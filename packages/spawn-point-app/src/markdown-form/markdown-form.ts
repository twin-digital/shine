import { map, reduce } from 'lodash/fp'

import { getTaskLists, TaskList } from '../markdown/task-lists'

export interface MarkdownField {
  /** ID for this field */
  id: string

  /** the type of field */
  type: 'checkbox'

  /** the field value */
  value: boolean
}

/** A pseudo "form" encoded in Markdown */
export interface MarkdownForm {
  fields: Record<string, MarkdownField>
}

export const taskListToFields = (taskList: TaskList) => reduce((result, item) => {
  return ({
    ...result,
    [item.text]: {
      id: item.text,
      type: 'checkbox',
      value: item.checked,
    } as const,
  })
}, {}, taskList.items)

/** Parse pseudo-form data from Markdown content */
export const parse = (content: string): MarkdownForm => {
  const taskLists = getTaskLists(content)

  const fieldSets = map(taskListToFields, taskLists)
  const fields = reduce((result, fieldSet) => ({
    ...result,
    ...fieldSet,
  }), {}, fieldSets)

  return { fields }
}
