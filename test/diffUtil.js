const axios = require('axios')
const { decryptElasticCreds } = require('discovery-api-indexer/lib/kms-helper')
const aws = require('aws-sdk')
const expect = require('chai').expect
const dotenv = require('dotenv')
const { diff, detailedDiff } = require('deep-object-diff')
const https = require('https')

dotenv.config({ path: './.env' })

let excludeBibProperties
let excludeHoldingProperties
let excludeItemProperties
let esUri = 'https://'

aws.config.credentials = new aws.SharedIniFileCredentials({ profile: "nypl-digital-dev" })


const versions = ['v1', 'v2']

async function records() {
  const records = {}

  try {
    esUri += await decryptElasticCreds()
  } catch (e) {
    console.log(e)
  }

  // populate v1Records and v2Records from the database

  let [v1Records, v2Records] = await Promise.all(['v1', 'v2']
  .map(async (dhiVersion) => {
    const resp = esResponse = await axios
    .post(`${esUri}/${process.env['TEST_INDEX']}-${dhiVersion}/resource/_search`, { size: 1000 })

    return resp.data.hits.hits.map((record) => record._source)
  }))


 // add the records to the records object. The records object will have the shape
 // { ... bibUri: { v1: v1Record, v2: v2Record, diff: [diff between v1 and v2, uri: bibUri ]} ... }

 // adding the v1 Records
  v1Records.forEach((r) => {
    const uri = r.uri
    if (!records[uri]) records[uri] = {}
    records[uri].v1 = r
  })

  // adding the v2Records
  v2Records.forEach((r) => {
    const uri = r.uri
    if (!records[uri]) records[uri] = {}
    records[uri].v2 = r
  })

  // add the uri to the record as a convenience
  Object.entries(records).forEach(([k,v]) => { v.uri = k })


  // add the diff to the record
  Object.values(records).forEach((record) => {
    record.diff = detailedDiff(record.v1, record.v2)
  })


  // records the differences by type (added/deleted/updated) and field
  // the diffFields attribute will have the shape
  // { added: {
  //      field1: [{uri: bibUri, v1: [v1 of the field], v2: [v2 of the field], diff: [diff] }],
  //      field2: ...
  //   },
  //   deleted: ...,
  //   updated: ... }
  records.diffFields = { added: {}, deleted: {}, updated: {} }
  Object.entries(records).forEach(([uri, record]) => {
    ['added', 'deleted', 'updated'].forEach((diffType) => {
      if (record.diff && record.diff[diffType]) {
        Object.keys(record.diff[diffType]).forEach((field) => {
          let diff = { uri: record.uri, diff: record.diff[diffType][field] }
          if (record.v1) diff.v1 = record.v1[field]
          if (record.v2) diff.v2 = record.v2[field]
          if (!records.diffFields[diffType][field]) records.diffFields[diffType][field] = []
          records.diffFields[diffType][field].push(diff)
        })
      }
    })
  })


 // add collection of all items and holdings under "items" and "holdings" attributes of the record object
 // so record has an 'items' attribute of the form:
 // items: {
 //    [uri] : {
 //     bibUri: [bibUri],
 //     v1: [v1 of item],
 //     v2: [v2 of item]
 //   }
 //  }
  Object.values(records).forEach((record) => {
    ['items', 'holdings'].forEach((attribute) => {
      ['v1', 'v2'].forEach((version) => {
        if (record[version] && record[version][attribute]) {
          record[version][attribute].forEach((subRecord) => {
            if (!records[attribute]) records[attribute] = {}
            let uri = subRecord.uri
            let bibUri = record.uri
            if (!records[attribute][uri]) records[attribute][uri] = {}
            records[attribute][uri][version] = subRecord
            records[attribute][uri].bibUri = bibUri
          })
        }
      })
    })
  })

  // add the diff to each item/holding in each of the bib records
  Object.values(records).forEach((record) => {
    ['items', 'holdings'].forEach((attribute) => {
      if (record[attribute]) {
        Object.values(record[attribute]).forEach((subRecord) => {
          subRecord.diff = detailedDiff(subRecord.v1, subRecord.v2)
        })
      }
    })
  })

 // add a checkInBoxes attribute to each holding of the form
 // checkInBoxes: {
 //   [box identifier]: {
 //     v1: version 1
 //     v2: version
 //    }
 // }
  Object.values(records.holdings).forEach((holding) => {
    let checkInBoxes = {}
    versions.forEach((version) => {
      if (holding[version].checkInBoxes) {
        holding[version].checkInBoxes.forEach((box) => {
          const identifier = box.shelfMark + box.coverage
          if (!checkInBoxes[identifier]) checkInBoxes[identifier] = {}
          checkInBoxes[identifier][version] = box
        })
      }
    })

    Object.values(checkInBoxes).forEach((box) => {
      if (box.v1 && box.v1) box.diff = detailedDiff(box.v1, box.v2)
    })

    holding.checkInBoxes = checkInBoxes
  })


 // add a diff attribute to each item and holding in the "items" and "holdings" attributes

  const attributes = ['items', 'holdings']
  attributes.forEach((attribute) => {
    if (records[attribute]) {
      Object.entries(records[attribute]).forEach(([k,v]) => {
        v.diff = detailedDiff(v.v1, v.v2)
      })
    }
  })


  // records the differences for items by type (added/deleted/updated) and field
  // the itemDiffFields attribute will have the shape
  // { added: {
  //      field1: [{uri: itemUri, bibUri: bibUri, v1: [v1 of the field], v2: [v2 of the field], diff: [diff] }],
  //      field2: ...
  //   },
  //   deleted: ...,
  //   updated: ... }
  records.itemDiffFields = { added: {}, deleted: {}, updated: {} }
  Object.entries(records.items).forEach(([uri, record]) => {
    ['added', 'deleted', 'updated'].forEach((diffType) => {
      if (record.diff && record.diff[diffType]) {
        Object.keys(record.diff[diffType]).forEach((field) => {
          let diff = { uri: uri, bibUri: record.bibUri, diff: record.diff[diffType][field] }
          if (record.v1) diff.v1 = record.v1[field]
          if (record.v2) diff.v2 = record.v2[field]
          if (!records.itemDiffFields[diffType][field]) records.itemDiffFields[diffType][field] = []
          records.itemDiffFields[diffType][field].push(diff)
        })
      }
    })
  })

  return records

}

module.exports = {
  records
}
