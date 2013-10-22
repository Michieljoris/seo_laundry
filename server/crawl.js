/*global module:false require:false process:false */
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:7 maxlen:150 devel:true newcap:false*/ 

//Gleaned miscellaneous from:
//https://npmjs.org/package/simplecrawler
//https://github.com/sylvinus/node-crawler
//https://npmjs.org/package/crawl

var Crawler = require("crawler").Crawler,
    // util = require("util"),
    VOW = require('dougs_vow'),
    Url = require('url'),
    sm = require('sitemap');

function crawl(options) {
    
    // var log = [];
    function debug() {
        if (options.verbose) console.log.apply(console, arguments);
        // log.push(arguments);
    }

    var seed = options.seed;
    var host = Url.parse(seed).host;
    if (!host) return vow.breek('No seed passed in.');
    var maxDepth = options.maxDepth || 1;
    var maxFollow = options.maxFollow || 0;
    var filter = options.filter ||
        function(url) {
            return url.host === host;
        };
    var vow = VOW.make();
    var links = {};
    var followed = 0;
    var kept = false;
    
    var c = new Crawler({
        "maxConnections":10 
        // ,timeout: 100 
        // ,retryTimeout: 100
        // ,retries:1
        ,onDrain: function() { respond();}
    });
    
    function respond() {
        var sitemap = {
              hostname: host,
              urls: []};
        if (kept) return;
        var result = { links: [], fragment: [], sitemap: [] };
        Object.keys(links).forEach(function(l) {
            result.links.push(l);
            if (links[l] === 'fragment') result.fragment.push(l);
            sitemap.urls.push( { url: l, changefreq: options.changefreq });
        });
        
        result.sitemap = sm.createSitemap(sitemap).toString();
        kept = true;
        vow.keep(result); 
    }

    function queue(uri, depth) {
        if (depth >= maxDepth) return;
        c.queue({ uri: uri,
                  callback:function(error,result,$) { 
                      if (!result) {
                          debug('No result!!');
                          return;
                      }
                      if (!options.siltent && !options.verbose)                                
                          process.stdout.write(".");
                      if (kept) {
                          debug('maxFollow reached, not parsing ' + result.uri);
                          return;   
                      }
                      debug('Parsing ',  result.uri);
                      depth++;
                      if (!error && $) {
                          var fragment = $('meta[name="fragment"][content="!"]');
                          
                          links[result.uri] = fragment.length ? 'fragment' : 'nofragment';
                          var anchors = $("a");
                          if (!anchors.length) debug('No links found.');
                          anchors.each(function(index,a) {
                              var url = Url.parse(a.href);
                              if (!maxFollow || followed < maxFollow) {
                                  if (filter(url) && !links[a.href]) {
                                      links[a.href] = true;
                                      followed++;
                                      debug('Following link ' + a.href);
                                      queue(a.href, depth);
                                  }
                              }
                              else  respond();
                          });
                      }
                  }
                });
    }
    
    queue(seed, 0);
    return vow.promise;
}

module.exports = crawl;

//test:
// var url = Url.parse("http://localhost:8080");
// // var url = Url.parse("http://localhost:6001");
// var host = url.host;
// var filter = function(url) {
    
//     // return true;
//     return url.host === host && !url.path.match(/\.pdf$/i);
    
//     // return url.host === host && url.hash && url.hash.indexOf('#!') === 0;
    
// }
// crawl({ seed: url.href, maxDepth: 1, maxFollow: 0, filter: filter, verbose: false, silent: false} )
// .when(
//     function(links) {
//         console.log(links);
//         console.log('Done');
//     }
// );


