const esUtils = require('discovery-api-indexer/lib')
const { decryptElasticCreds } = require('discovery-api-indexer/lib/kms-helper')
const aws = require('aws-sdk')
const dotenv = require('dotenv')

dotenv.config({ path: './.env' })

const v1Index = process.env['TEST_INDEX'] + '-v1'
const v2Index = process.env['TEST_INDEX'] + '-v2'

const init = async () => {
  aws.config.credentials = new aws.SharedIniFileCredentials({ profile: "nypl-digital-dev" })
  const esUri = await decryptElasticCreds()
  esUtils.setConnection(esUri)
  await esUtils.admin.deleteIndex(v1Index)
  await esUtils.admin.deleteIndex(v2Index)
  console.log(`Deleted ${v1Index} and ${v2Index}`)
}

init()