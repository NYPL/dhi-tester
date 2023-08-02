# DHI TESTER
This repo is a testing framework meant to facilitate comparing output of a new indexer lambda to replace the old discovery-hybrid-indexer (aka DHI). All scripts mentioned in this readme are written to be run from the root directory. Throughout this Readme, v1 refers to the currently deployed version of discovery-hybrid-indexer, and v2 refers to the new indexer that is being tested. Note that the v2 directory needs to have a sam.test.yml file configured with all necessary environment variables. You can use the sam.qa.yml file in the v1 DHI as a template.

## System Requirements
- aws sam cli must be installed and configured.
- You must have Docker installed and running in order to start a local lambda invocation.

## How to use the DHI Tester Repo

# Config
In addition to the config files required by v1 and v2 indexers, you will need:
- .env file in the root of the repo
    - in .env, update TEST_INDEX to test-index-{yourinitials}. ex: test-index-vk
- `sam.test.yml` in the root of v1 and v2. For v1, this should be identical to `sam.qa.yml` in discovery-hybrid-indexer, with one change: replace the value for ELASTIC_SEARCH_RESOURCES_INDEX with test-index-{your initials}-v1 or -v2

### Setting up environment:
0. `nvm use && npm i`
1. Clone the latest v1 discovery-hybrid-indexer into the root of this directory. Rename the directory v1
2. Clone the new v2 indexer you are testing into a different directory. Name this directory v2
3. Create v1/sam.test.yml . Copy the contents of sam.qa.yml into it, and replace ELASTIC_RESOURCES_INDEX with test-index-{your initials}-v1. Make sure there is a v2/sam.test.yml that has the necessary config, along with ELASTIC_RESOURCES_INDEX = test-index-{your initials}-v2.
4. Create a blank Elastic Search indexes for v1 and v2 to write to: `npm run recreate-es-indexes`
5. Install v1 and v2 as necessary

### URIs for indexing
To update uris.csv, export from this google sheet https://docs.google.com/spreadsheets/d/1a2QKIsRJrEPel2K5znzxnwoREzDWJOMZ6nIfz2EsDRg/edit#gid=0 and save in the root as uris.csv

### Update events
To rebuild unencoded records and encoded events, run `npm run rebuild-events`. If faced with the error: `Unable to load module 'csv-parse/sync'`, try running `nvm use`.
### Running tests
1. Start up local lambda for v1: `npm run start-lambda-v1`
2. In a separate terminal, send the events to the lambda: `npm run send-events-v1`.
3. Repeat steps 1+2 replacing v1 with v2 in the scripts
4. Check that the ES indices are identical: `npm test`
### Readable Reporting for Test Results
Once you have run the tests, you may want a more readable report of the differences between v1 and v2. This command:
```
node test/run-diffUtil.js
```

will print a complete report of the differences between v1 and v2. The output JSON has:
- bibUris pointing to objects with v1 and v2 attributes for that bib
- items and holdings attributes, each with item identifiers pointing to v1 and v2 versions of those items and holdings
- diffFields attribute, which contains `addded`, `deleted`, and `updated` objects. Each object has a key for each changed field, and each field points to a list of bibs by uri, with v1 and v2 of that field
- similarly, there is an `itemDiffFields` attribute.

This report can be very long, so it is also helpful to open a node terminal, and require `test/diffUtil`. Running the `records` method will generate the above JSON.

### Cleanup
To delete Elastic Indexes created, run `node cleanup-elastic-index`

### Troubleshooting
- make sure discovery-api-indexer is at most recent version in root level package.json
-
