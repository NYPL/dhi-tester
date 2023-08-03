const axios = require('axios')
const { decryptElasticCreds } = require('discovery-api-indexer/lib/kms-helper')
const aws = require('aws-sdk')
const expect = require('chai').expect
const dotenv = require('dotenv')
const { printDiff } = require('../v1/test/diff-report')
const https = require('https')

dotenv.config({ path: './common.env' })
dotenv.config({ path: './.env' })

describe('v1 writes the same record to elastic search as v2', async () => {
  let excludeBibProperties
  let excludeHoldingProperties
  let excludeItemProperties
  let esUri = 'https://'
  before(async () => {
    aws.config.credentials = new aws.SharedIniFileCredentials({ profile: "nypl-digital-dev" })
    try {
      esUri += await decryptElasticCreds()
    } catch (e) {
      console.log(e)
    }
    // These are properties known to be indexed differently in the new indexer.
    excludeBibProperties = process.env.EXCLUDE_BIB_PROPERTIES?.split(',')
    excludeItemProperties = process.env.EXCLUDE_ITEM_PROPERTIES?.split(',')
    excludeHoldingProperties = process.env.EXCLUDE_HOLDING_PROPERTIES?.split(',')
    excludeCheckInBoxProperties = process.env.EXCLUDE_CHECKIN_BOX_PROPERTIES?.split(',')
  })
  it('writes identical indexes to elastic search', async () => {
    let esResponse
    let [v1Records, v2Records] = await Promise.all(['v1', 'v2']
      .map(async (dhiVersion) => {
        try {
          esResponse = await axios
            .post(`${esUri}/${process.env['TEST_INDEX']}-${dhiVersion}/resource/_search`, { size: 1000 })
        } catch (e) {
          if(e.code === 'ECONNREFUSED'){
            throw new Error('ElasticSearch connection refused')
          }
          if(e.response?.status === 403){ 
            throw new Error('Elastic Search permissions error. Make sure you are on a permitted IP address or using the tunnel and swapped out localhost:port for the ES URI in the .env file')
          } else throw e
        }
        return esResponse.data.hits.hits.map((record) => {
          excludeBibProperties?.forEach((bibProp) => {
            delete record._source[bibProp]
          })
          excludeItemProperties?.forEach((itemProp) => {
            record._source.items.forEach((item) => {
              delete item[itemProp]
            })
          })
          excludeHoldingProperties?.forEach((holdingProp) => {
            record._source.holdings.forEach((holding) => {
              delete holding[holdingProp]
            })
          })
          record._source.holdings.forEach((holding) => {
            holding.checkInBoxes?.forEach((box) => {
              excludeCheckInBoxProperties?.forEach((prop) => {
                delete box[prop]
              })
            })
          })
          return record._source
        })
      }))

    v1Records.forEach((v1Record) => {
      const v2Record = v2Records.find((record2) => {
        return v1Record.uri === record2.uri
      })
      printDiff(v1Record, v2Record)
    })
    expect(v1Records).to.deep.equal(v2Records)
  })
})
