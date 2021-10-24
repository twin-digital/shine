import { getTaskLists } from '../../src/markdown/task-lists'

const NO_LISTS = `
# Heading
Some text goes here
`

const LISTS_WITHOUT_TASKS = `
# Unordered
* Item 1
* Item 2

# Ordered
1. Item 3
2. Item 4
`

const ORDERED_LIST_WITH_TASKS = `
# Ordered
1. [ ] Item 1
2. [x] Item 2
2. [X] Item 3
`

const UNORDERED_LIST_WITH_TASKS = `
# Unordered
* [ ] Item 1
* [x] Item 2
* [X] Item 3
`

const MULTIPLE_LISTS = `
# Ordered
1. [ ] Item 1
2. [x] Item 2
2. [X] Item 3

# Not a checklist
* Milk
* Bread

# Unordered
* [ ] Item 4
* [x] Item 5
* [X] Item 6
`

const TASK_LIST_WITH_SOME_NON_TASKS = `
# Unordered
* [ ] Task 1
* Not a task
* [X] Task 2
`

describe('getTaskLists', () => {
  it('returns empty array if no lists', () => {
    const result = getTaskLists(NO_LISTS)
    expect(result).toHaveLength(0)
  })

  it('returns empty array if no lists contain tasks', () => {
    const result = getTaskLists(LISTS_WITHOUT_TASKS)
    expect(result).toHaveLength(0)
  })

  it('parses ordered lists with tasks', () => {
    const result = getTaskLists(ORDERED_LIST_WITH_TASKS)
    const items = result?.[0]?.items
    
    expect(result).toHaveLength(1)
    expect(items).toHaveLength(3)
    
    // labels
    expect(items[0].text).toEqual('Item 1')
    expect(items[1].text).toEqual('Item 2')
    expect(items[2].text).toEqual('Item 3')

    // check state
    expect(items[0].checked).toBe(false)
    expect(items[1].checked).toBe(true)
    expect(items[2].checked).toBe(true)
  })

  it('parses unordered lists with tasks', () => {
    const result = getTaskLists(UNORDERED_LIST_WITH_TASKS)
    const items = result?.[0]?.items
    
    expect(result).toHaveLength(1)
    expect(items).toHaveLength(3)
    
    // labels
    expect(items[0].text).toEqual('Item 1')
    expect(items[1].text).toEqual('Item 2')
    expect(items[2].text).toEqual('Item 3')

    // check state
    expect(items[0].checked).toBe(false)
    expect(items[1].checked).toBe(true)
    expect(items[2].checked).toBe(true)
  })

  it('returns only lists with tasks, if some have none', () => {
    const result = getTaskLists(MULTIPLE_LISTS)
    expect(result).toHaveLength(2)
  })

  it('does not return non-task list items', () => {
    const result = getTaskLists(TASK_LIST_WITH_SOME_NON_TASKS)
    const items = result?.[0]?.items

    expect(result).toHaveLength(1)
    expect(items).toHaveLength(2)
    expect(items[0].text).toBe('Task 1')
    expect(items[1].text).toBe('Task 2')
  })
})
