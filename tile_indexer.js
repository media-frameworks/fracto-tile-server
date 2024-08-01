const fs = require('fs');

const tile_index = []

const BIN_VERB_INDEXED = "indexed";
let bin_verb = process.argv[2]
if (!bin_verb) {
   bin_verb = BIN_VERB_INDEXED
}
const tile_bin_dir  = `./tiles/${bin_verb}`
if (!fs.existsSync(tile_bin_dir)) {
   console.log("adding tiles dir", tile_bin_dir)
   fs.mkdirSync(tile_bin_dir);
}

const URL_BASE = "http://dev.mikehallstudio.com/am-chill-whale/src/data/fracto";

const load_short_codes = (tile_set_name, cb) => {
   const directory_url = `${URL_BASE}/directory/${tile_set_name}.csv`;
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

const index_tiles = (batch_list) => {
   for (let line_index = 0; line_index < batch_list.length; line_index++) {
      const short_code = batch_list[line_index].trim();
      const level = short_code.length
      const bounds = bounds_from_short_code(short_code)
      let level_bin = tile_index
         .find(bin => bin.level === level)
      if (!level_bin) {
         level_bin = {
            level: level,
            tile_size: bounds.right - bounds.left,
            columns: []
         }
         tile_index.push(level_bin)
      }
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
      if (line_index % 10000 === 0) {
         console.log(line_index)
      }
   }
}


const TILES_IN_PACKET = 50000

const packet_manifest ={
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
   index_tiles(result)
   console.log(`tile_index contains ${tile_index.length} levels`)
   for (let i = 0; i < tile_index.length; i++) {
      const level = tile_index[i].level
      let packet_index = 0
      let tile_count = 0
      let packet_columns = []
      for (let col_index = 0; col_index < tile_index[i].columns.length; col_index++) {
         const column = tile_index[i].columns[col_index]
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