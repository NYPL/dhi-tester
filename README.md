# DHI Tester

This repo is a testing framework meant to facilitate comparing output of a new indexer lambda to replace the old discovery-hybrid-indexer (aka DHI). All scripts mentioned in this readme are written to be run from the root directory. Throughout this Readme, v1 refers to the currently deployed version of discovery-hybrid-indexer, and v2 refers to the new indexer that is being tested. Note that the v2 directory needs to have a sam.test.yml file configured with all necessary environment variables. You can use the sam.qa.yml file in the v1 DHI as a template. 

## System Requirements

- aws sam cli must be installed and configured.
- You must have Docker installed and running in order to start a local lambda invocation.

## How to use the DHI Tester Repo

### 1. Configure the Tester

Create your own `.env`:

```
cp .env-sample .env
```

And edit `TEST_INDEX` to use your initials.

### 2. Prepare the indexers

1. Clone the latest v1 discovery-hybrid-indexer into the root of this directory. Rename the directory v1
2. Clone the new v2 indexer you are testing into a different directory. Name this directory v2
3. Create v1/sam.test.yml . Copy the contents of sam.qa.yml into it, and replace ELASTIC_RESOURCES_INDEX with test-index-{your initials}-v1. Make sure there is a v2/sam.test.yml that has the necessary config, along with ELASTIC_RESOURCES_INDEX = test-index-{your initials}-v2.
4. Create a blank Elastic Search indexes for v1 and v2 to write to: `npm run recreate-es-indexes`
5. Install v1 and v2 as necessary (i.e. `cd v1; nvm use; npm i; cd ../v2; nvm use; npm i`)

### 3. Prepare test data

To update `uris.csv`, export from this google sheet https://docs.google.com/spreadsheets/d/1a2QKIsRJrEPel2K5znzxnwoREzDWJOMZ6nIfz2EsDRg/edit#gid=0 and save in the root as `uris.csv`

Rebuild event files:

`npm run rebuild-events`

If faced with the error: `Unable to load module 'csv-parse/sync'`, try running `nvm use`.

### 4. Populate the indexes

1. Start up local lambda for v1: `npm run start-lambda-v1`
2. In a separate terminal, send the events to the lambda: `npm run send-events-v1`. 
3. Repeat steps 1+2 replacing v1 with v2 in the scripts

### 5. Test parity

Check that the ES indices are identical: `npm test`

### Cleanup

To delete Elastic Indexes created, run `node cleanup-elastic-index`

### Troubleshooting

Getting "strict mapping" errors when writing documents to ES?
- Make sure discovery-api-indexer is at most recent version in root level package.json. You may need to run `npm i github:NYPL-discovery/discovery-api-indexer#v1.8.0` (or whatever the latest tag is) manually in the Terminal to force an install of the latest tag.
