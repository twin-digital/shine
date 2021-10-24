import { Probot } from 'probot'
import { getTaskLists } from './markdown/task-lists';

export = (app: Probot) => {
  app.log.info('Starting Spawn Point...')

  app.on('repository.created', async (context) => {
    await context.octokit.issues.create({
      ...context.repo(),
      title: 'Configure Repository',
      body: `### Repository Configuration
Please select which of the following blueprints to install in this repository:

* [ ] Lorem Ipusm
`
    })
  })

  app.on('issues.edited', async (context) => {
    const issue = (await context.octokit.issues.get({
      ...context.issue(),
    })).data

    if (issue.user?.login == 'spawn-point[bot]') {
      context.log(`Tasks: ${JSON.stringify(getTaskLists(issue.body ?? ''), null, 2)}`)
    }
  })
};
