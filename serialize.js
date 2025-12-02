const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SEPARATOR = path.sep;

const short_code = process.argv[2]
if (!short_code) {
   console.log("usage: node serialize <short_code>\n")
   process.exit(1);
}

const serialize_dir = `.${SEPARATOR}serialized`
if (!fs.existsSync(serialize_dir)) {
   fs.mkdirSync(serialize_dir);
}

const level = short_code.length
const naught = level < 10 ? '0' : ''
const folder = `${serialize_dir}${SEPARATOR}L${naught}${level}`
if (!fs.existsSync(folder)) {
   fs.mkdirSync(folder);
}

const filename = `/var/www/html/L${naught}${level}/${short_code}.gz`
var inp = fs.createReadStream(filename)

var lineProcessing = function (err, data) {
   if (!err) {
      console.log("line: " + n)
      console.log(data.toString())
   }
}

inp.on('data', function (chunk) {
   zlib.gunzip(chunk, lineProcessing)
}).on('end', function () {
   console.log('ende');
});