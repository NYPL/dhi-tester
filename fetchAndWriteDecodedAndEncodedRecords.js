const { parse } = require('csv-parse/sync')
const NyplClient = require('@nypl/nypl-data-api-client')
const dotenv = require('dotenv')
const NyplSourceMapper = require('discovery-store-models/lib/nypl-source-mapper')
const NyplStreamsClient = require('@nypl/nypl-streams-client')
const { decrypt } = require('discovery-api-indexer/lib/kms-helper')
const fs = require('fs')


dotenv.config({ path: './.env' })

const input = fs.readFileSync('./uris.csv', 'utf8')

/**
 * Exracts uris from uris.csv, and fetches those records from bib, item, or holding service. Writes those records to events/decoded. Batches those records into kinesis events by record type and writes encoded events to events/encoded
 *
 * Depends on encrypted Platform API creds in .env
 *
 * Usage:
 *   node rebuild-events
 */

const fetchAndWriteDecodedAndEncodedRecords = async () => {
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
        fs.writeFile(`./events/decoded/${uri.id}.json`, JSON.stringify(record.data), err => {
          if (err) {
            console.error(err);
          }
        })
        return {...uri, record}
      }
    } catch (error) {
      console.error(error)
    }
  })).filter(uri => uri)

  // NyplStreamsClient exposes functions to encode and write to kinesis streams
  const streamClient = new NyplStreamsClient()
  // loop through all of the uris. get the encoded version of the record, and add it to relevant array.
  const encodedRecordsByType = Promise.all(urisPlus.reduce(async (encodedRecords, uriObject) => {
    const schemaName = uriObject.type
    const record = uriObject.record
    const encodedRecord = await streamClient.encodeData(schemaName, record)
    encodedRecords[schemaName].concat(encodedRecord)
    return encodedRecords
  }, {Bib:[], Item:[], Holding:[]}))

  // write arrays to encoded/type.json
  Object.keys(encodedRecordsByType).map((recordType) => {
    const events = encodedRecordsByType[recordType].map((encodedRecord) => {
      return {
        "kinesis": {
          "kinesisSchemaVersion": "1.0",
          "partitionKey": "s1",
          "sequenceNumber": "00000000000000000000000000000000000000000000000000000001",
          "data": encodedRecord,
          "approximateArrivalTimestamp": 1428537600
        },
        "eventSource": "aws:kinesis",
        "eventVersion": "1.0",
        "eventID": "shardId-000000000000:00000000000000000000000000000000000000000000000000000001",
        "eventName": "aws:kinesis:record",
        "invokeIdentityArn": "arn:aws:iam::EXAMPLE",
        "awsRegion": "us-east-1",
        "eventSourceARN": `the-first-part-of-the-arn-does-not-matter...this-part-does:/${recordType}`
      }
    })
    fs.writeFile(`./events/encoded/${recordType}.json`, JSON.stringify({Records: events}), err => {
      if (err) {
        console.error(err);
      }
    })
  })
}

fetchAndWriteDecodedAndEncodedRecords()