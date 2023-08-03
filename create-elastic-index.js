const esUtils = require('discovery-api-indexer/lib')
const { decryptElasticCreds } = require('discovery-api-indexer/lib/kms-helper')
const aws = require('aws-sdk')
const dotenv = require('dotenv')

dotenv.config({ path: './common.env' })
dotenv.config({ path: './.env' })

const init = async () => {
  aws.config.credentials = new aws.SharedIniFileCredentials({ profile: "nypl-digital-dev" })
  const esUri = await decryptElasticCreds()
  esUtils.setConnection(esUri)
  // Create new index. Second param, deleteIfExists, ensures that the new index will overwrite
  // and old one with the same name.
  await esUtils.resources.prepare(process.env['TEST_INDEX'] + '-v1', true)
  await esUtils.resources.prepare(process.env['TEST_INDEX'] + '-v2', true)
  console.log(`Dropped and recreated ${process.env['TEST_INDEX']}-v1 and ${process.env['TEST_INDEX']}-v2`)
}

init()
