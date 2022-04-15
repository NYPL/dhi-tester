# DHI TESTER
All scripts mentioned in this readme are written to be run from the root directory.

## How to use the DHI Tester Repo

0. `npm i`
1. Pull the latest v1 discovery-hybrid-indexer:`npm run pull-dhi`
2. Pull the new v2 indexer you are testing into a different directory. Name this directory v2-discovery-hybrid-indexer
3. Install v1 as necessary: `npm run install-v2`
4. Create a blank Elastic Search indexes for v1 and v2 to write to: `npm run start-es`
5. Start up local lambda for v1: `npm run start-lambda-v1`
6. In a separate terminal, send the events to the lambda:
`npm run send-events-v1`
7. Repeat steps 3-6 replacing v1 with v2 in the scripts
8. Check that the ES indices are identical: `npm test`

## Config
In addition to the config files required by v1 and v2 indexers, you will need:
- `sam.test.yml` in the root of v1 and v2. For v1, this should be identical to `sam.qa.yml` in discovery-hybrid-indexer, with one change: replace ELASTIC_SEARCH_RESOURCES_INDEX with test-index-v1 or -v2
- `decrypted.env` Make sure to gitignore this file. This file needs to contain these decrypted credentials:
```
NYPL_API_BASE_URL=http://qa-platform.nypl.org/api/v0.1/
NYPL_OAUTH_URL=https://isso.nypl.org/
NYPL_OAUTH_KEY=[decrypted key]
NYPL_OAUTH_SECRET=[decrypted secret]
```

## Generate avro encoded events:

Making sure you have decrypted credentials in your --envfile, you can use this script to create events to pass into your lambdas. 

`node ./v1discovery-hybrid-indexer/node_modules/pcdm-store-updater/kinesify-data.js --profile nypl-digital-dev --envfile decrypted.env --ids <recordId> --nyplType <bib, item, holding?> events/encoded/<outfile>.json events/decoded/<infile>.json`




