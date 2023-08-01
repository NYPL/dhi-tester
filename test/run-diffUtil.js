const { records } = require('./diffUtil')

const run = async () => {
  const report = await records()

  console.log(JSON.stringify(report, null, 2))
}

run()
