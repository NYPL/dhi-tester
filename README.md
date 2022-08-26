# DHI TESTER
This repo is a testing framework meant to facilitate comparing output of a new indexer lambda to replace the old discovery-hybrid-indexer (aka DHI). All scripts mentioned in this readme are written to be run from the root directory. Throughout this Readme, v1 refers to the currently deployed version of discovery-hybrid-indexer, and v2 refers to the new indexer that is being tested. Note that the v2 directory needs to have a sam.test.yml file configured with all necessary environment variables. You can use the sam.qa.yml file in the v1 DHI as a template. 

## System Requirements
- aws sam cli must be installed and configured.
- You must have Docker installed and running in order to start a local lambda invocation.

## How to use the DHI Tester Repo

# Config
In addition to the config files required by v1 and v2 indexers, you will need:
- .env file in the root of the repo
- `sam.test.yml` in the root of v1 and v2. For v1, this should be identical to `sam.qa.yml` in discovery-hybrid-indexer, with one change: replace ELASTIC_SEARCH_RESOURCES_INDEX with test-index-v1 or -v2

### Setting up environment:
0. `nvm use && npm i`
1. Clone the latest v1 discovery-hybrid-indexer into the root of this directory. Rename the directory v1
2. Clone the new v2 indexer you are testing into a different directory. Name this directory v2
3. Create v1/sam.test.yml . Copy the contents of sam.qa.yml into it, and replace ELASTIC_RESOURCES_INDEX with "test-index-v1". Make sure there is a v2/sam.test.yml that has the necessary config, along with ELASTIC_RESOURCES_INDEX = test-index-v2.
4. Create a blank Elastic Search indexes for v1 and v2 to write to: `npm run start-es`
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

### Troubleshooting
- make sure discovery-api-indexer is at most recent version in root level package.json
- 




