/*global module:false require:false */
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:7 maxlen:150 devel:true newcap:false*/ 

var parseString = require('xml2js').parseString,
    util = require('util'),
    request = require('request'),
    Url = require('url'),
    VOW = require('dougs_vow'),
    links = require('./links')


;

// var sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url> <loc>http://localhost:8080/</loc> <changefreq>weekly</changefreq> <priority>0.5</priority> </url>\n<url> <loc>http://localhost:8080/sync-to-linode.sh</loc> <changefreq>weekly</changefreq> <priority>0.5</priority> </url>\n<url> <loc>http://localhost:8080/serve</loc> <changefreq>weekly</changefreq> <priority>0.5</priority> </url>\n<url> <loc>http://localhost:8080/server/</loc> <changefreq>weekly</changefreq> <priority>0.5</priority> </url>\n<url> <loc>http://localhost:8080/package.json</loc> <changefreq>weekly</changefreq> <priority>0.5</priority> </url>\n<url> <loc>http://localhost:8080/node_modules/</loc> <changefreq>weekly</changefreq> <priority>0.5</priority> </url>\n<url> <loc>http://localhost:8080/README.md</loc> <changefreq>weekly</changefreq> <priority>0.5</priority> </url>\n<url> <loc>http://localhost:8080/package.js</loc> <changefreq>weekly</changefreq> <priority>0.5</priority> </url>\n</urlset>'


// parseString(sitemap, function (err, result) {
//     console.dir(result);
//     console.dir(util.inspect(result));
// });
var options = {
    verbose: true
};

// var log = [];
function debug() {
    if (options.verbose) console.log.apply(console, arguments);
    // log.push(arguments);
}


function fetchSitemap(url) {
    var vow = VOW.make();
    request(Url.resolve(url, 'sitemap.xml'), function(err, response, body) {
        if (err || response.statusCode !== 200) vow.breek('no sitemap found');
        else {
            parseString(body, function(err, result) {
                if (err) vow.breek(err);
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

function crawl(site) {
    var vows = [];
    if (site.sitemap) vows.push(fetchSitemap(site.url));
    
    var url = Url.parse("http://localhost:8080");
    var host = url.host;
    
    //TODO filter out not only pdf, but doc, excel, etc
    // var filter = function(url) {
    //     // return true;
    //     return url.host === host && !url.path.match(/\.pdf$/i);
    //     // return url.host === host && url.hash && url.hash.indexOf('#!') === 0;
    // };
   
    if (site.spider) vows.push(
        links.harvest({ seed: site.url,
                        maxDepth: 2,
                        maxFollow: 0,
                        // filter: filter,
                        verbose: false,
                        silent: false,
                        // ignore: ['pdf', 'doc', 'xls', 'png', 'jpg'],
                        hashBang: true,
                        metaFragment: true
                      } )
    );

    VOW.every(vows).when(
        function(data) {
            debug(links.metaFragment());
            debug(links.sitemap());
            debug('texthtml', links.textHtml());
            debug(data);
        },
            function(err) {
                debug(err);
            }
    );
}

function go(sites) {
    Object.keys(sites).forEach(function(url) {
        var site = sites[url];
        site.url = url;
        crawl(site);
    }); 
}

module.exports = go;


var sites =  {
    "http://localhost:8080" : {
        expire: 10 //seconds befor memory cache items expire
        ,frequency: 24 * 60 * 60 //seconds in between crawls, falsy is disable
        //at least one of the following has to be true, otherwise no
        //links will be crawled
        ,sitemap: true  //true to use sitemap
        ,spider: true //true to follow all links found
        //some servers ever only serve one page to a site, then all
        //paths are js dependent, so set following false
        ,hashbang: false //true to follow only hashbang paths
    }
};

go(sites);
