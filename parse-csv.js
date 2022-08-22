const { parse } = require('csv-parse/sync')
const fs = require('fs')
const { exec } = require('child_process')
const NyplClient = require('@nypl/nypl-data-api-client')
const dotenv = require('dotenv')
const NyplSourceMapper = require('discovery-store-models/lib/nypl-source-mapper')


dotenv.config({ path: './decrypted.env' })

const input = fs.readFileSync('./uris.csv', 'utf8')

const extractAndFilterUris = (e, records) => {
  uris = records.map((record) => record[1]).filter((record) => record).slice(1)
}

let records = parse(input, {
  columns: true,
  skip_empty_lines: true
})

// TO DO: filter out empty record objects
let urisPlus = records.map((record) => record.URI).map((uri) => NyplSourceMapper.instance().splitIdentifier(uri)).filter((uri) => uri)
// console.log(urisPlus)
const dataApi = new NyplClient({
  oauth_key: process.env['NYPL_OAUTH_KEY'],
  base_url: process.env['NYPL_API_BASE_URL'],
  oauth_secret: process.env['NYPL_OAUTH_SECRET'],
  oauth_url: process.env['NYPL_OAUTH_URL']
})

records = Promise.all(urisPlus.map(async (uri, i) => {
  if (uri && uri.type && uri.nyplSource && uri.id) {
    try {
      const record = await dataApi.get(`${uri.type}s/${uri.nyplSource}/${uri.id}`)
      if (record.statusCode !== 404) {
        fs.writeFile(`./events/decoded/${uri.id}.json`, JSON.stringify(record), err => {
          if (err) {
            console.error(err);
          }
        })
        await exec(`node v1/node_modules/pcdm-store-updater/kinesify-data.js --profile nypl-digital-dev --envfile decrypted.env --ids ${uri.id} --nyplType ${uri.type} events/decoded/${uri.id}.json events/encoded/${uri.id}.json`, (e) => {
          if (e) console.error(e)
        })
      }
    } catch (error) {
      console.log(error)
    }
  }

}))


module.exports = records