/*global module:false require:false __dirname:false*/
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:7 maxlen:150 devel:true newcap:false*/ 

var fs = require('fs-extra'),
    md5 = require('MD5'),
    Path = require('path')
;


//TODO catch exceptions of deleteSync and outputJsonSync

var requesters = {};
var cacheDir = './cache/';

//To clear out unused files..
// fs.deleteSync(cacheDir);

function disk(key, cb) {
    var value;
    if (typeof cb === 'function') {
        try {
            value = fs.readJsonSync(Path.resolve(__dirname, cacheDir, md5(key))).val;
        } catch(e) {
            console.log('error', e);
            requesters[key] =  requesters[key] || [];
            requesters[key].push(cb);
            return false;
        }
        cb(value);
    }     
    else {
        value = cb;    
        if (value === undefined) {
            fs.deleteSync(cacheDir + md5(key));
            delete requesters[key];
        }
        else {
            fs.outputJsonSync(Path.resolve(__dirname, cacheDir, md5(key)), { val: value } );
        
            if (requesters[key]) {
                requesters[key].forEach(function(cb) {
                    cb(value);
                });
                delete requesters[key];
            }
        }
    }
    return true;
}

module.exports = function(someCacheDir) {
    cacheDir = someCacheDir;
    return disk; 
};

//test
// fs.deleteSync('./cache');
// disk('a', 2);

// disk('a', function(value) {
//     console.log(value);
// });

// disk('b', function(value) {
//     console.log(value);
// });

// disk('b', function(value) {
//     console.log(value);
// });

// disk('b', { a: 1, b: "hello" } );
