const fs = require('fs');

const BIN_VERB_INDEXED = "indexed";
let bin_verb = process.argv[2]
if (!bin_verb) {
   bin_verb = BIN_VERB_INDEXED
}
const tiles_dir = '/var/www/html/manifest/tiles'
if (!fs.existsSync(tiles_dir)) {
   console.log("adding tiles_dir", tiles_dir)
   fs.mkdirSync(tiles_dir);
}
const tile_bin_dir = `${tiles_dir}/${bin_verb}`
if (!fs.existsSync(tile_bin_dir)) {
   console.log("adding tile_bin_dir", tile_bin_dir)
   fs.mkdirSync(tile_bin_dir);
}

const URL_BASE = "http://54.221.86.16";

const streamCsvFromUrl = async (url, cb) => {
   try {
      // 1. Fetch the remote resource and get a readable stream
      const response = await fetch(url);

      if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
      }
      results = []

      // 2. Pipe the response body stream to the csv-parser transform stream
      response.body // This is a Node.js ReadableStream
         .pipe(csv()) // Transform stream converts CSV chunks to JS objects
         .on('data', (data) => {
            // 3. Process each row of data as it comes in
            const jsonData = JSON.stringify(data);
            results.push(data.short_code);

            if (results.length % 100000 === 0) {
               console.log(results.length, jsonData.short_code);
            }
         })
         .on('end', () => {
            // 4. Handle the end of the stream
            console.log('Finished reading CSV file.');
            console.log(`Total rows processed: ${results.length}`);
            cb(results);
            // console.log('All results:', results);
         })
         .on('error', (error) => {
            // 5. Handle any errors during streaming or parsing
            console.error('Error during CSV processing:', error);
         });
   } catch (error) {
      console.error('Fetch operation failed:', error);
   }
}

const load_short_codes = (tile_set_name, cb) => {
   const directory_url = `${URL_BASE}/manifest/${tile_set_name}.csv`;
   streamCsvFromUrl(directory_url, result => {
      cb(result)
   })
}

const load_short_codes_not = (tile_set_name, cb) => {
   const directory_url = `${URL_BASE}/manifest/${tile_set_name}.csv`;
   fetch(directory_url)
      .then(response => response.text())
      .then(csv => {
         const lines = csv.split("\n");
         console.log(`fetch_bin_async ${lines.length}`)
         cb(lines.slice(1))
      })
}

const bounds_from_short_code = (short_code) => {
   let left = -2;
   let right = 2;
   let top = 2;
   let bottom = -2;
   let scope = 4.0;
   for (let i = 0; i < short_code.length; i++) {
      const half_scope = scope / 2;
      const digit = short_code[i];
      switch (digit) {
         case "0":
            right -= half_scope;
            bottom += half_scope;
            break;
         case "1":
            left += half_scope;
            bottom += half_scope;
            break;
         case "2":
            right -= half_scope;
            top -= half_scope;
            break;
         case "3":
            left += half_scope;
            top -= half_scope;
            break;
         default:
            debugger;
      }
      scope = half_scope;
   }
   return {
      left: left,
      right: right,
      top: top,
      bottom: bottom
   }
}

const index_tiles = (level, batch_list) => {
   level_bin = {
      level: level,
      tile_size: Math.pow(2, 2 - level),
      columns: []
   }
   let processed = 0
   for (let line_index = 0; line_index < batch_list.length; line_index++) {
      const short_code = batch_list[line_index].trim();
      if (short_code.length !== level) {
         continue
      }
      processed++
      const bounds = bounds_from_short_code(short_code)
      let tile_column = level_bin.columns
         .find(column => column.left === bounds.left)
      if (!tile_column) {
         tile_column = {
            left: bounds.left,
            tiles: []
         }
         level_bin.columns.push(tile_column)
      }
      const tile = {
         bottom: bounds.bottom,
         short_code: short_code
      }
      tile_column.tiles.push(tile)
      if (processed % 100000 === 0) {
         console.log(`level ${level} ${processed}`)
      }
   }
   console.log(`level ${level} ${processed}`)
   return level_bin
}


const TILES_IN_PACKET = 50000

const packet_manifest = {
   tile_count: 0,
   packet_files: []
}

const write_packet_file = (level, packet_columns, packet_index) => {
   const packet_indicator = packet_index === -1 ? '' : `_(${packet_index + 1})`
   const filename = `tile_packet_bin_${bin_verb}_level_${level}${packet_indicator}.json`
   const filepath = `${tile_bin_dir}/${filename}`
   const packet_data = {
      level: level,
      columns: packet_columns
   }
   console.log(`writing file ${filepath}`)
   fs.writeFileSync(filepath, JSON.stringify(packet_data))
   packet_manifest.packet_files.push(filename)
}

load_short_codes(bin_verb, result => {
   for (let level = 2; level <= 35; level++) {
      const level_bin = index_tiles(level, result)
      console.log(`level_bin contains ${level_bin.columns.length} columns`)
      let packet_index = 0
      let tile_count = 0
      let packet_columns = []
      for (let col_index = 0; col_index < level_bin.columns.length; col_index++) {
         const column = level_bin.columns[col_index]
         packet_columns.push(column)
         tile_count += column.tiles.length
         if (tile_count > TILES_IN_PACKET) {
            write_packet_file(level, packet_columns, packet_index++)
            packet_manifest.tile_count += tile_count
            tile_count = 0
            packet_columns = []
         }
      }
      if (packet_columns.length) {
         write_packet_file(level, packet_columns, packet_index ? packet_index : -1)
      }
   }
   const manifest_path = `${tile_bin_dir}/packet_manifest.json`
   fs.writeFileSync(manifest_path, JSON.stringify(packet_manifest))
})

