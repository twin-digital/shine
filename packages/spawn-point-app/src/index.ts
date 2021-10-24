import { Probot } from 'probot'

export = (app: Probot) => {
  app.log.info('Starting Spawn Point...')

  app.on('repository.created', async (context) => {
    context.log.info(`Repository created: ${JSON.stringify(context.repo())}`)
    context.log.info(`Repository created: ${JSON.stringify(context.repo())}`)

    await context.octokit.issues.create({
      ...context.repo(),
      title: 'Configure Repository',
      body: `### Repository Configuration
Please select which of the following blueprints to install in this repository:

* [ ] Lorem Ipusm
`
    })
  })
};
