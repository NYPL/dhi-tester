// cd into local instance of DHI repo
// for each file in events, sam invoke local with that file. 
const fs = require('fs')
const AWS = require('aws-sdk')

AWS.config.credentials = new AWS.SharedIniFileCredentials({profile: "nypl-digital-dev"})

const lambda = new AWS.Lambda({
  endpoint: 'http://127.0.0.1:3001'
});

//loop thru events, create array and forEach invoke them (promise all?)
//  would invoking it many times create new instances? would rather just have them queue...
const folderPath = './events'
fs.readdirSync(folderPath).map(fileName => {
  fs.readFile(`${folderPath}/${fileName}`, 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return
    }
    // lambda.invoke({
    //   FunctionName: 'discovery-hybrid-indexer-qa'
    // }, (err, res) => {
    //   console.log(res);
    // });
    console.log(lambda)
  })
})

