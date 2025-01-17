var fs = require('fs'),
    JSZip = require('jszip'),
    path = require('path'),
    args = process.argv.slice(2),
    zip = new JSZip();

if(/-h|-H|--help|-\?/.test(args)||!args.length) {
  printHelp();
} else {
  var command = args.shift();
  if(command == '-c') {
    var zipfile = args.shift();
    console.log('Creating %s...', zipfile);
    args.forEach(function(file) {
      if(fs.existsSync(file)) {
        addFile(file);
      } else {
        console.error('Error: file %s not found.', file);
        process.exit(2);
      }
    });
    console.log("Deflating...")
    fs.writeFileSync(zipfile, zip.generate({type:"nodebuffer", compression:'DEFLATE'}));
    console.log("Done.")
  } else if(command == '-x') {
    var zipfile = args.shift();
    var destination = args.shift();
    var zipdata = fs.readFileSync(zipfile);
    console.log('Reading %s...', zipfile);
    try {
      var zip = new JSZip(zipdata, {checkCRC32: true});
    } catch(e) {
      console.error("Error: invalid file");
      process.exit(2);
    }
    Object.keys(zip.files).forEach(function(filepath) {
      file = zip.files[filepath];
      if (destination) filepath = destination + path.sep + filepath
      if(file.options.dir) {
        console.log('  Creating', filepath);
        mkdirRecursively(filepath);
      } else {
        console.log('  Inflating', filepath);
        // TODO: add prompt if file exists
        fs.writeFileSync(filepath, file.asNodeBuffer());
      }
    });
    console.log('Done.');
  } else {
    console.error('Error: wrong command')
    printHelp();
  }
}

function printHelp() {
  console.error('Usage:');
  console.error('  -c zipfile file1 [file2] [...]           Create zip file with file/directory list');
  console.error('  -x zipfile [destination]                 Extract zip file');
  console.error('  -h | -H | --help | -?                    Show help');
  process.exit(1);
}

function addFile(filepath) {
  if(fs.lstatSync(filepath).isDirectory()) {
    console.log("  Adding folder", filepath);
    zip.folder(filepath);
    var directory = fs.readdirSync(filepath);
    directory.forEach(function(subfilepath) {
      addFile(path.join(filepath,subfilepath));
    });
  } else {
    console.log("  Adding file", filepath);
    zip.file(filepath, fs.readFileSync(filepath));
  }
}

function mkdirRecursively(folderpath, mode) {
  try {
    fs.mkdirSync(folderpath, mode);
    return true;
  } catch(e) {
    if (e.errno == 34) {
      mkdirRecursively(path.dirname(folderpath), mode);
      mkdirRecursively(folderpath, mode);
    } else if (e.errno == 47) {
      return true;
    } else {
      console.log("Error: Unable to create folder %s (errno: %s)", folderpath, e.errno)
      process.exit(2);
    }
  }
};
