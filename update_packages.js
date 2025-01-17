const fs = require('fs');
const path = require('path');

const network = require('./admin/network.json')
const URL_BASE = network.dev_server_url;
const FRACTO_URL = network.fracto_server_url;

const INDEXED_TILES_URL = `${URL_BASE}/directory/indexed.csv`;
const UPDATED_TILES_URL = `${URL_BASE}/directory/updated.csv`;
const SEPARATOR = path.sep;

const package_dir = `.${SEPARATOR}package`
if (!fs.existsSync(package_dir)) {
   fs.mkdirSync(package_dir);
}

const download_packages = (list, cb) => {
   const short_code = list.pop()
   const url = `${FRACTO_URL}/get_packages.php?short_codes=${short_code}`
   fetch(url)
      .then(response => response.json())
      .then(json => {
         if (json["packaged"][short_code]) {
            const buffer = Buffer.from(json["packaged"][short_code], 'base64');
            const level = short_code.length
            const naught = level < 10 ? '0' : ''
            const folder = `${package_dir}${SEPARATOR}L${naught}${level}`
            if (!fs.existsSync(folder)) {
               fs.mkdirSync(folder);
            }
            const filename = `${folder}${SEPARATOR}${short_code}.gz`
            fs.writeFileSync(filename, buffer)
            console.log(short_code)
         }
         if (list.length % 100 === 0) {
            console.log(`${list.length} to go`)
         }
         if (list.length) {
            download_packages(list, cb)
         } else {
            cb('complete')
         }
      })
      .catch(err => {
         console.log("download_packages fail", short_code, err)
         download_packages(list, cb)
      });
}

fetch(UPDATED_TILES_URL)
   .then(response => response.text())
   .then(csv1 => {
      const lines = csv1.split("\n");
      let removedFiles = 0
      for (let line_index = 1; line_index < lines.length; line_index++) {
         const values = lines[line_index].split(',');
         const short_code = String(values[0]);
         const level = short_code.length
         const naught = level < 10 ? '0' : ''
         const folder = `${package_dir}${SEPARATOR}L${naught}${level}`
         const filename = `${folder}${SEPARATOR}${short_code}.gz`
         if (fs.existsSync(filename)) {
            fs.unlinkSync(filename)
            removedFiles++
         }
      }
      console.log(`update: removed ${removedFiles} from package cache`)
      fetch(INDEXED_TILES_URL)
         .then(response => response.text())
         .then(csv2 => {
            const lines = csv2.split("\n");
            const not_found = []
            for (let line_index = 1; line_index < lines.length; line_index++) {
               const values = lines[line_index].split(',');
               const short_code = String(values[0]);
               // console.log(short_code)

               const level = short_code.length
               if (level > 30) {
                  continue;
               }
               const naught = level < 10 ? '0' : ''
               const filename = `${package_dir}${SEPARATOR}L${naught}${level}${SEPARATOR}${short_code}.gz`
               if (!fs.existsSync(filename)) {
                  not_found.push(short_code)
               }
               if (line_index % 10000 === 0) {
                  console.log(`${not_found.length}/${line_index}`)
               }
            }
            console.log(`indexed: ${lines.length}, not_found: ${not_found.length}`)
            download_packages(not_found, when_complete => {
               console.log('completed.')
            })
         })
   })


