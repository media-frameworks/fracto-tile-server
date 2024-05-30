const fs = require('fs');

const network = require('./admin/network.json')
const URL_BASE = network.dev_server_url;
const FRACTO_URL = network.fracto_server_url;

const INDEXED_TILES_URL = `${URL_BASE}/directory/indexed.csv`;
const package_dir = `.\\package`

const download_packages = (list) => {
   const short_code = list.pop()
   const url = `${FRACTO_URL}/get_packages.php?short_codes=${short_code}`
   fetch(url)
      .then(response => response.json())
      .then(json => {
         if (json["packaged"][short_code]) {
            const buffer = Buffer.from(json["packaged"][short_code], 'base64');
            const level = short_code.length
            const naught = level < 10 ? '0' : ''
            const filename = `${package_dir}\\L${naught}${level}\\${short_code}.gz`
            fs.writeFileSync(filename, buffer)
            console.log(short_code)
         }
         if (list.length % 100 === 0) {
            console.log(`${list.length} to go`)
         }
         if (list.length) {
            download_packages(list)
         }
      })
}

fetch(INDEXED_TILES_URL)
   .then(response => response.text())
   .then(csv => {
      const lines = csv.split("\n");
      const not_found = []
      for (let line_index = 1; line_index < lines.length; line_index++) {
         const values = lines[line_index].split(',');
         const short_code = String(values[0]);
         // console.log(short_code)

         const level = short_code.length
         if (level > 20) {
            continue;
         }
         const naught = level < 10 ? '0' : ''
         const filename = `${package_dir}\\L${naught}${level}\\${short_code}.gz`
         if (!fs.existsSync(filename)) {
            not_found.push(short_code)
         }
         if (line_index % 10000 === 0) {
            console.log(`${not_found.length}/${line_index}`)
         }
      }
      console.log(`indexed: ${lines.length}, not_found: ${not_found.length}`)
      download_packages(not_found)
   })

