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
    // WIP: Log difference between two indexes
    // v1Records.forEach((v1Record, i) => {
    //   const v2Record = v2Records[i]
    //   Object.keys(v1Record).forEach((recordProp, i) => {
    //     const v1RecordPropValue = v1Record[recordProp]
    //     const v2RecordPropValue = v2Record[recordProp]

    //     // These conditionals are here to log discrepancies between the indices
    //     if (Array.isArray(v1RecordPropValue)) {
    //       if (v1RecordPropValue[0] !== v2RecordPropValue[0]) {
    //         console.log(`Record mismatch on record: v1: ${v1Record.uri}, v2: ${v2Record.uri}, property: ${recordProp} \n v1: ${v1RecordPropValue} v2: ${v2RecordPropValue}`)
    //       }
    //     }
    //     else if (typeof (v1RecordPropValue) === 'string') {
    //       if (v1RecordPropValue !== v2RecordPropValue) {
    //         console.log(`Record mismatch on record: v1: ${v1Record.uri}, v2: ${v2Record.uri}, property: ${recordProp} \n v1: ${v1RecordPropValue} v2: ${v2RecordPropValue}`)
    //       }
    //     }
    //     else if (typeof (v1RecordPropValue) === 'object') {
    //       if (JSON.stringify(v1RecordPropValue) !== JSON.stringify(v2RecordPropValue[0])) {
    //         console.log(`Record mismatch on record: v1: ${v1Record.uri}, v2: ${v2Record.uri}, property: ${recordProp} \n v1: ${JSON.stringify(v1RecordPropValue)} v2: ${JSON.stringify(v2RecordPropValue)}`)
    //       }
    //     }
    //   })
    // })
    expect(v1Records).to.deep.equal(v2Records)
  })
})