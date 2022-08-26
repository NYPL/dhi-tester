const axios = require('axios')
const { decryptElasticCreds } = require('discovery-api-indexer/lib/kms-helper')
const aws = require('aws-sdk')
const expect = require('chai').expect
const dotenv = require('dotenv')

dotenv.config({ path: './.env' })

describe('v1 writes the same record to elastic search as v2', async () => {
  let esUri = 'https://'
  before(async () => {
    aws.config.credentials = new aws.SharedIniFileCredentials({ profile: "nypl-digital-dev" })
    try {
      esUri += await decryptElasticCreds()
    } catch (e) {
      console.log(e)
    }
  })
  it('writes identical indexes to elastic search', async () => {
    let [v1Records, v2Records] = await Promise.all(['v1', 'v2']
      .map(async (dhiVersion) => {
        const esResponse = await axios.post(`${esUri}/${process.env['TEST_INDEX']}-${dhiVersion}/resource/_search`, { size: 1000 })
        return esResponse.data.hits.hits.map((record) => {
          delete record._source.updatedAt
          return record._source
        })
      }))
    expect(v1Records).to.deep.equal(v2Records)
  })
})