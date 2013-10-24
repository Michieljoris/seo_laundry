/*global module:false require:false process:false */
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:7 maxlen:150 devel:true newcap:false*/ 

//Gleaned miscellaneous from:
//https://npmjs.org/package/simplecrawler
//https://github.com/sylvinus/node-crawler
//https://npmjs.org/package/crawl

var Crawler = require("crawler").Crawler,
    VOW = require('dougs_vow'),
    Url = require('url'),
    sm = require('sitemap'),
    request = require('request'),
    extend = require('extend'),
    parseString = require('xml2js').parseString,
    wash = require('url_washer'),
    fs = require('fs-extra'),
    md5 = require('MD5')
// util = require("util"),
;

//TODO update dougs_vow repo with my vow.status edit
//TODO update wash.js in repo
//TODO this is only save when called when it's not busy because of the module wide vars.

var followed;
var dynamic;
var host;
var busy;

var options = { maxDepth: 1,
                maxFollow: 0,
                verbose: true,
                silent: false,
                //timeout for a request:
                timeout: 100,
                //interval before trying again:
                retryTimeout: 100,
                retries:1,
                ignore: ['pdf', 'doc', 'xls', 'png', 'jpg', 'png','js', 'css' ],
                filter: function(url, host) {
                    var parsed = Url.parse(url);
                    function ignore(url) {
                        return options.ignore.some(function(e) {
                            return url.match(new RegExp('\\.' + e + '$', 'i'));
            
                        });
                    }
                    return parsed.host !== host || ignore(url);
                },
                cacheDir: './cache',
                sitemap: false
              };

// var log = [];
function debug() {
    if (options.verbose) console.log.apply(console, arguments);
    // log.push(arguments);
}

function fetchSitemap(url) {
    var vow = VOW.make();
    request(Url.resolve(url, 'sitemap.xml'), function(err, response, body) {
        if (err || response.statusCode !== 200) vow.keep([]);
        else {
            parseString(body, function(err, result) {
                if (err) {
                    debug('no sitemap found');
                    vow.keep([]);   
                }
                else {
                    var urls = [];
                        result.urlset.url.forEach(function(l) {
                            urls.push(l.loc[0]);
                        });
                    vow.keep(urls);   
                }
            }); 
        }
    });
    return vow.promise;
}

function process(vow, seed) {
    
    function fetch(method, uri, depth) {
        if (options.maxFollow && followed.length >= options.maxFollow) {
            if (vow.status === 'pending') vow.keep();
        }
        else {
            if (followed[uri] || options.filter(uri, host) ||
                depth > options.maxDepth) return;
        
            followed[uri] = true;
            debug('Following link ' + uri + ' with ' + method);
            //QUEUE
            queue[method](
                uri, function(error, result, $) {
                    if (options.maxFollow && followed.length >= options.maxFollow) 
                        debug('maxFollow reached, not parsing ' + result.uri);
                    else parse(error, result, $, depth);
                });
        }
    }

    function parse(error, result, $, depth) { 
        if (result) {
            if (!options.silent && !options.verbose)                                
                parse.stdout.write(".");
            if (result.headers['content-type'] === 'text/html' && !error && $) {
                debug('Parsing ',  result.uri);
                if ($('meta[name="fragment"][content="!"]').length)
                    fetch('phantom', result.uri, depth); //fetch again
                else { var anchors = $("a");
                       if (!anchors.length) debug('No links found.');
        
                       anchors.each(function(index,a) {
                               var url = Url.parse(a.href);
                               var method = url.hash && url.hash.indexOf('#!') === 0 ? 
                               'phantom' :'crawl';
                           fetch(method, a.href, depth + 1);
                       });
                     }
            }
        }
        else  debug('Nothing to parse');
    }
    fetch('crawl', seed, 0);
}

var queue;

function harvest(seed) {
    var vow = VOW.make();
    
    var c = new Crawler({
        "maxConnections":10 
        ,timeout: options.timeout
        ,retryTimeout: options.retryTimeout
        ,retries: options.retries
        ,onDrain: function() {
            if (vow.status === 'pending') vow.keep();
        }
    });
    
    queue = {
        crawl: function(url, cb) {
            c.queue({ uri: url, callback: cb });
        }
        ,phantom: function(url, cb) {
            //TODO implement queue for phantom 
            dynamic.push(url);
            wash(options.url).when(
                function(html) {
                    fs.outputJsonSync(options.cacheDir + md5(url), { val: html } );
                    cb(null, html, 'jquery!!!!!!');
                }
                ,function(err) {
                    debug('ERROR washing url:', err);
                    cb('Error washing url');
                    //cancels callbacks:
                }
            );
            
        }
    };
    process(vow, seed);
    
    return vow.promise;
}

function respond(vow, host) {
    if (!options.sitemap) 
        vow.keep(dynamic);   
    else {
        var sitemap = {
            hostname: host,
            urls: []};
        Object.keys(followed).forEach(function(l) {
            sitemap.urls.push( { url: l, changefreq: options.changefreq });
        });
    
        sitemap = sm.createSitemap(sitemap).toString();
        vow.keep(sitemap);
    } 
    busy = false;
}

function go(seed) {
    if (busy) {
        throw "crawl: Still busy I am!!!!"
    }
    busy = true;
    
    var vow = VOW.make();
    var seeds = [];
    followed = {};
    dynamic = [];
    
    host = Url.parse(seed).host;
    
    if (!host) 
        return vow.breek('No seed passed in.');
    
    fetchSitemap(seed).when(
        function(someLinks) {
            if (!options.sitemap) 
                someLinks.forEach(function(l) {
                    seeds.push(l);
                });
            if (seed) seeds.push(seed);
            function recur() {
                if (seeds.length) {
                    harvest(seeds.pop(), host).when(
                        recur
                    );
                }
                else respond(vow, host);
            }
            
            recur();
        }
    );
    return vow.promise;
}

module.exports =  function(someOptions) {
    options = extend(options, someOptions);
    return go;
};

// go('http://localhost:8080').when(
//     function(data) {
//         console.log(data);
//     }
//     ,function(err) {
//         console.log('ERROR', err);
//     }
// );




//test:
// var url = Url.parse("http://localhost:8080");
// // // var url = Url.parse("http://localhost:6001");
// var host = url.host;
// var filter = function(url) {
//     // return true;
//     return url.host === host && !url.path.match(/\.pdf$/i);
//     // return url.host === host && url.hash && url.hash.indexOf('#!') === 0;
// }

// harvest({ seed: url.href, maxDepth: 2, maxFollow: 0, filter: filter, verbose: false, silent: false} )
// .when(
//     function(links) {
//         console.log(links);
//         console.log('Done');
//     }
// );

// function ignore(url, host) {
//     var parsed = Url.parse(url);
//     function ignore(url) {
//         return options.ignore.some(function(e) {
//             return url.match(new RegExp('\\.' + e + '$', 'i'));
            
//         });
//     }
//     return parsed.host !== host || ignore(url);
// }
// var r = ignore('http://localhost:8080/bla.do', 'localhost:8080')
// console.log(r);

// var url = 'http://localhost:8080/bla.jpg';
// var m = url.match(new RegExp('\\.' + 'xpg' + '$', 'i'));
// console.log(m);
