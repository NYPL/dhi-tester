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
let uris = records.map((record) => NyplSourceMapper.instance().splitIdentifier(record.URI)).filter((record) => Object.keys(record).length === 3)
console.log(uris)

dataApi = new NyplClient({
  oauth_key: process.env['NYPL_OAUTH_KEY'],
  base_url: process.env['NYPL_API_BASE_URL'],
  oauth_secret: process.env['NYPL_OAUTH_SECRET'],
  oauth_url: process.env['NYPL_OAUTH_URL']
})

// records = Promise.all(records.map(async (uri, i) => {
//   const servicesRecord = await dataApi.get(`bibs/sierra-nypl/${uri}`)
//   return servicesRecord
//   // exec(`node ./v1discovery-hybrid-indexer/node_modules/pcdm-store-updater/kinesify-data.js --profile nypl-digital-dev --envfile decrypted.env --ids ${uri} --nyplType ${recordType(uri)} events/encoded/event${i}.json events/decoded/<infile>.json`)
// }))

module.exports = records