const fs = require('fs');
const path = require('path');

const SEPARATOR = path.sep;
const URL_BASE = "http://54.221.86.16";

const package_dir = `.${SEPARATOR}package`
if (!fs.existsSync(package_dir)) {
   fs.mkdirSync(package_dir);
}

const load_short_codes = (cb) => {
   const directory_url = `${URL_BASE}/manifest/indexed.csv`;
   fetch(directory_url)
      .then(response => response.text())
      .then(csv => {
         const lines = csv.split("\n");
         // console.log(`fetch_bin_async ${lines.length}`)
         cb(lines.slice(1))
      })
}

load_short_codes(result => {
   console.log(`load_short_codes ${result.length} tiles`)
   let needs_update = []
   for (let line_index = 0; line_index < result.length; line_index++) {
      const short_code = result[line_index].trim();
      const level = short_code.length
      const naught = level < 10 ? '0' : ''
      const folder = `${package_dir}${SEPARATOR}L${naught}${level}`
      if (!fs.existsSync(folder)) {
         fs.mkdirSync(folder);
      }
      if (line_index % 10000 === 0) {
         console.log(`${needs_update.length}/${line_index}`)
      }
      const filename = `${folder}${SEPARATOR}${short_code}.gz`
      if (fs.existsSync(filename)) {
         continue;
      }
      needs_update.push(short_code)
   }
   console.log(`${needs_update.length}/${result.length}`)
})
