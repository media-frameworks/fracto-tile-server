const express = require("express");
const cors = require('cors');
const fs = require('fs');
const {close, open, utimes} = require('fs');
const server = require('./admin/server.json')
const network = require('./admin/network.json')

const URL_BASE = network.fracto_server_url;
app = express();
const PORT = server.port

app.use(express.json());
app.use(express.urlencoded({extended: false}))

app.use(cors({
   origin: "*"
}));

app.listen(PORT, () => console.log(`Server listening at port ${PORT}`));

const dir = `.\\tiles`
if (!fs.existsSync(dir)) {
   console.log("adding tiles dir", dir)
   fs.mkdirSync(dir);
}
const package_dir = `.\\package`

app.get("/get_tiles", (req, res) => {
   const short_code_list = req.query.short_codes;
   const short_codes = short_code_list.split(',')
   let remote_tiles = []
   let results = {}
   let files_count = 0;
   for (let i = 0; i < short_codes.length; i++) {
      const short_code = short_codes[i]
      const filename = `${dir}\\${short_code}.json`
      if (fs.existsSync(filename)) {
         results[short_code] = JSON.parse(fs.readFileSync(filename))
         files_count++
         touch(filename, err => {
            if (err) throw err;
         });
         continue;
      }
      remote_tiles.push(short_code)
   }
   if (!remote_tiles.length) {
      const result = {
         short_codes: short_codes,
         tiles: results
      }
      console.log(`returning ${Object.keys(results).length} result(s) quickly`)
      res.send(result);
      // cleanup_cache(req)
      return;
   }

   const remote_tiles_list = remote_tiles.join(',')
   console.log(`calling for ${remote_tiles.length} tile(s) remotely (${Object.keys(results).length} tiles are cached)`)
   const url = `${URL_BASE}/get_tiles.php?short_codes=${remote_tiles_list}`
   fetch(url)
      .then(response => response.json())
      .then(json => {
         const tile_keys = Object.keys(json.tiles)
         for (let i = 0; i < tile_keys.length; i++) {
            const short_code = tile_keys[i]
            results[short_code] = json.tiles[short_code]
            const filename = `${dir}\\${short_code}.json`
            fs.writeFileSync(filename, JSON.stringify(json.tiles[short_code]));
         }
         const result = {
            short_codes: short_codes,
            tiles: results
         }
         console.log(`returning ${Object.keys(results).length} result(s), remote: ${tile_keys.length}, on file: ${files_count}`)
         res.send(result);
      })
});

const touch = (path, callback) => {
   const time = new Date();
   utimes(path, time, time, err => {
      if (err) {
         return open(path, 'w', (err, fd) => {
            err ? callback(err) : close(fd, callback);
         });
      }
      callback();
   });
};

app.get("/get_packages", (req, res) => {
   const short_code_list = req.query.short_codes;
   const short_codes = short_code_list.split(',')
   let results = {}
   const not_found = []
   for (let i = 0; i < short_codes.length; i++) {
      const short_code = short_codes[i]
      const level = short_code.length
      const naught = level < 10 ? '0' : ''
      const filename = `${package_dir}\\L${naught}${level}\\${short_code}.gz`
      if (fs.existsSync(filename)) {
         const zipfile_contents = fs.readFileSync(filename)
         results[short_code] = new Buffer(zipfile_contents).toString("base64")
      } else {
         not_found.push(short_code)
      }
   }
   const result = {
      short_codes: short_codes,
      packages: results,
      not_found: not_found
   }
   console.log(`returning ${Object.keys(results).length} package(s) of ${short_codes.length} short codes`)
   res.send(result);
   // if (not_found.length) {
   //    const remote_tiles_list = not_found.join(',')
   //    console.log(`calling for ${not_found.length} tile(s) to be packaged`)
   //    const url = `${URL_BASE}/package_tiles.php?short_codes=${remote_tiles_list}`
   //    fetch(url)
   //       .then(response => response.json())
   //       .then(json => {
   //
   //       })
   // }
});