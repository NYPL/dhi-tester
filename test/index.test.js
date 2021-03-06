const axios = require('axios')
const { decryptElasticCreds } = require('discovery-api-indexer/lib/kms-helper')
const aws = require('aws-sdk')
const expect = require('chai').expect

describe('v1 writes the same record to elastic search as v2', () => {
  let esUri = 'https://'
  before(async () => {
    aws.config.credentials = new aws.SharedIniFileCredentials({ profile: "nypl-digital-dev" })
    try {
      esUri += await decryptElasticCreds()
    } catch (e) {
      console.log(e)
    }
  })
  it('does the thing', async () => {
    let v1Records = await axios.post(esUri + '/test-index-v1/resource/_search', {})
    v1Records = v1Records.data.hits.hits.map((record) => {
      delete record._source.updatedAt
      return record._source
    })
    let v2Records = await axios.post(esUri + '/test-index-v2/resource/_search', {})
    v2Records = v2Records.data.hits.hits.map((record) => {
      delete record._source.updatedAt
      return record._source
    })
    
    expect(v1Records).to.deep.equal(v2Records)
  })
})