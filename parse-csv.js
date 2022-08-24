const { parse } = require('csv-parse/sync')
const fs = require('fs')
const { exec } = require('child_process')
const NyplClient = require('@nypl/nypl-data-api-client')
const dotenv = require('dotenv')
const NyplSourceMapper = require('discovery-store-models/lib/nypl-source-mapper')


dotenv.config({ path: './decrypted.env' })

const input = fs.readFileSync('./uris.csv', 'utf8')

const writeDecodedAndEncodedRecords = async () => {
  let records = parse(input, {
    columns: true,
    skip_empty_lines: true
  })

  // TO DO: filter out empty record objects
  let urisPlus = records.map((record) => record.URI).map((uri) => NyplSourceMapper.instance().splitIdentifier(uri)).filter((uri) => uri && uri.type && uri.id && uri.nyplSource)

  const dataApi = new NyplClient({
    oauth_key: process.env['NYPL_OAUTH_KEY'],
    base_url: process.env['NYPL_API_BASE_URL'],
    oauth_secret: process.env['NYPL_OAUTH_SECRET'],
    oauth_url: process.env['NYPL_OAUTH_URL']
  })

  urisPlus = await Promise.all(urisPlus.map(async (uri) => {
    try {
      const record = await dataApi.get(`${uri.type}s/${uri.nyplSource}/${uri.id}`)
      if (record.type !== 'exception') {
        fs.writeFile(`./events/decoded/${uri.id}.json`, JSON.stringify(record.data), err => {
          if (err) {
            console.error(err);
          }
        })
        return uri
      } else return { ...uri, exception: true }
    } catch (error) {
      console.log(error)
    }
  }))

  const batchedUrisByType = { bib: '', item: '', holding: '' }
  urisPlus.filter(uri => !uri.exception).forEach((uri) => {
    batchedUrisByType[uri.type] += `events/decoded/${uri.id}.json,`
  })

  const types = Object.keys(batchedUrisByType)
  Promise.all(types.map(async (type) => {
    if (batchedUrisByType[type].length > 1) {
      console.log(type[0].toUpperCase() + type.substring(1), batchedUrisByType[type], '\n')
      try {
      await exec(`node v1/node_modules/pcdm-store-updater/kinesify-data.js --profile nypl-digital-dev --envfile decrypted.env ${batchedUrisByType[type].slice(0, -1)} events/encoded/${type}.json https://platform.nypl.org/api/v0.1/current-schemas/${type[0].toUpperCase() + type.substring(1)}`, (e) => {
        if (e) console.error(e)
      })
      } catch (e) {
        console.log(e)
      }
    }
  }))

}

writeDecodedAndEncodedRecords()

module.exports = writeDecodedAndEncodedRecords