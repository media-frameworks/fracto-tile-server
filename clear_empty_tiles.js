const config = require('./acw-common/config/aws.json')
const network = require('./admin/network.json')

const URL_BASE = network.dev_server_url;
const EMPTY_TILES_URL = `${URL_BASE}/directory/empty.csv`;

const S3_PREFIX = 'fracto';

var AWS = require('aws-sdk');
var s3 = new AWS.S3(config);

const delete_file_async = (path, prefix = S3_PREFIX, cb) => {
   const params = {
      Bucket: "mikehallstudio",
      Key: prefix + "/" + path
   };
   s3.deleteObject(params, (err, data) => {
      if (err) {
         // console.log("Delete file Error", err);
         cb(err)
      }
      else {
         console.log(params.Key)
         cb(data)
      }
   });
}

const delete_s3_tiles = (list) => {
   const short_code = list.pop()
   delete_file_async(`tiles/256/indexed/${short_code}.json`, 'fracto', result => {
      if (list.length % 100 === 0) {
         console.log(`${list.length} to go`)
      }
      if (list.length) {
         delete_s3_tiles(list)
      }
   })
}

fetch(EMPTY_TILES_URL)
   .then(response => response.text())
   .then(csv => {
      const lines = csv.split("\n");
      for (let line_index = 1; line_index < 1000 /*lines.length*/; line_index++) {
         const values = lines[line_index].split(',');
         const short_code = String(values[0]);
         console.log(short_code)
         const level = short_code.length
         if (level > 20) {
            continue;
         }
         if (line_index % 10000 === 0) {
            console.log(`${not_found.length}/${line_index}`)
         }
      }
      delete_s3_tiles(lines)
      console.log(`empty: ${lines.length}`)
   })

