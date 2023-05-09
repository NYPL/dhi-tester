const { parse } = require('csv-parse/sync')
const NyplClient = require('@nypl/nypl-data-api-client')
const dotenv = require('dotenv')
const NyplSourceMapper = require('discovery-store-models/lib/nypl-source-mapper')
const { decrypt } = require('discovery-api-indexer/lib/kms-helper')
const fs = require('fs')


dotenv.config({ path: './.env' })

const input = fs.readFileSync('./uris.csv', 'utf8')

/**
 * Writes unencoded records from bib, item, or holding service to events/encoded. Batches those records into kinesis events by record type and writes encoded events to events/encoded
 *
 * Depends on encrypted Platform API creds in .env
 *
 * Usage:
 *   node rebuild-events
 */

const fetchUnencodedRecords = async () => {
  let records = parse(input, {
    columns: true,
    skip_empty_lines: true
  })

  let urisPlus = records.map((record) => record.URI)
    .map((uri) => NyplSourceMapper.instance().splitIdentifier(uri))
    .filter((uri) => uri && uri.type && uri.id && uri.nyplSource)

  const [oauth_key, base_url, oauth_secret, oauth_url] = await Promise.all([
    decrypt(process.env['NYPL_OAUTH_KEY']),
    decrypt(process.env['NYPL_API_BASE_URL']),
    decrypt(process.env['NYPL_OAUTH_SECRET']),
    decrypt(process.env['NYPL_OAUTH_URL'])])

  const dataApi = new NyplClient({
    oauth_key,
    base_url,
    oauth_secret,
    oauth_url
  })

  urisPlus = await Promise.all(urisPlus.map(async (uri) => {
    try {
      const record = await dataApi.get(`${uri.type}s/${uri.nyplSource}/${uri.id}`)
      if (record.type !== 'exception') {
        fs.writeFile(`./events/unencoded/${uri.id}.json`, JSON.stringify(record.data), err => {
          if (err) {
            console.error(err);
          }
        })
        return uri
      } else return { ...uri, exception: true }
    } catch (error) {
      console.error(error)
    }
  }))

  const batchedUrisByType = { bib: '', item: '', holding: '' }

  urisPlus.filter(uri => !uri.exception)
    .forEach((uri) => {
      batchedUrisByType[uri.type] += `events/decoded/${uri.id}.json,`
    })
}

fetchUnencodedRecords()