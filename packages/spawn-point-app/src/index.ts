import { Probot } from 'probot'

import { ConfigurationManager } from './configuration-manager'

export = (app: Probot) => {
  app.log.info('Starting Spawn Point...')

  app.on('repository.created', async (context) => {
    await context.octokit.issues.create({
      ...context.repo(),
      title: 'Configure Repository',
      body: `### Repository Configuration
Please select which of the following blueprints to install in this repository:

* [ ] Lorem Ipusm
`,
    })
  })

  app.on('issues.edited', async (context) => {
    const issue = (await context.octokit.issues.get({
      ...context.issue(),
    })).data

    if (issue.user?.login === 'spawn-point[bot]' && issue.body !== undefined && issue.body !== null) {
      // TODO: more robust checks on issue
      // TODO: handle empty body differently

      const config = await new ConfigurationManager(context.octokit, context.repo())
      await config.updateConfigurationChangePr()
    }
  })
};
