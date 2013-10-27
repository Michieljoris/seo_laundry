/*global module:false require:false */
/*jshint strict:false unused:true smarttabs:true eqeqeq:true immed: true undef:true*/
/*jshint maxparams:7 maxcomplexity:7 maxlen:150 devel:true newcap:false*/ 

//TODO possibly use memcache
//TODO compress memory cache? Still faster then disk..
//TODO compress disk cache? 
//TODO Serve gzipped
//TODO Edit Readme
//TODO see TODO's in text below
//TODO have api to rewash url

//RISKS: memory and/or disk can get full, but site would have to be big..

//RISKS: requests for bogus path for legit host, phantom js gets into
//gear every time, slows computer down. Better is to crawl whitelisted
//sites every so often.


var sites =  {
    // "http://firstdoor.axion5.net" : 1 //days between crawls, 0 is don't schedule crawls
    "http://localhost:6001" : 1 //days between crawls, 0 is don't schedule crawls
};

var options = {
    verbose: true,
    cacheSize: 10,
    //TODO set expire to a higher number. Which number?
    expire: 10, //time before memory cache items expire
    onDemand: false,
    cacheDir: './cache',
    crawl: {
        schedule: true,
        start: 3, //hour of the day
        now: false
    }
};

var //fs = require('fs'),
    wash = require('url_washer'),
    sys = require('sys'),
    // VOW = require('dougs_vow'),
    memory = require('cachejs').lru(options.cacheSize, options.expire).cache,
    Url = require('url'),
    crawl = require('./crawl')({ cacheDir: options.cacheDir }),
    disk = require('./disk')(options.cacheDir)

;
console.log(memory);
require('date-utils');

// var log = [];
function debug() {
    if (options.verbose) console.log.apply(console, arguments);
    // log.push(arguments);
}

function escapeHtml(value) {
    return value.toString().
        replace('<', '&lt;').
        replace('>', '&gt;').
        replace('"', '&quot;');
}

function sendError(req, res, error) {
    res.writeHead(500, {
        'Content-Type': 'text/html'
    });
    res.write('<!doctype html>\n');
    res.write('<title>Internal Server Error</title>\n');
    res.write('<h1>Internal Server Error</h1>');
    res.write('<pre>' + escapeHtml(sys.inspect(error)) + '</pre>');
    res.end();
    debug('500 Internal Server Error');
    debug(sys.inspect(error));
}

module.exports.handleGet = function(req, res) {
    var url = req.url.query.url;
    var parsed = Url.parse(url || '');
    if (!parsed) return res.end('Please pass in an url..');
    var onDisk;
    var site = sites[parsed.protocol + '//' + parsed.host];
    if (!site) {
        res.end('Not just any site..');
        return;
    }
    
    var inMemory = memory(url, function(value) {
        debug('url found in memory');
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'max-age=0'
	    // ,'last-modified': GMTdate
        });
        res.end(value.html);
    }); 
    
    if (!inMemory)  {
        debug('url not found in memory');
        onDisk = disk(url, function(html) {
            debug('url found on disk');
            memory(url, html);
        });
        if (!onDisk) {
            debug('url not found on disk');
            if (options.onDemand) {
                debug('about to wash url', url)
                //TODO only wash when meta is found or shebang as
                //query
                wash(url).when(
                    function(html) {
                        disk(url, html);
                    }
                    ,function(err) {
                        debug('ERROR washing url:', err);
                        //cancels callbacks:
                        memory(url);
                        disk(url);
                        sendError(req, res, err);
                    }
                );
            }
            else {
                memory(url);
                disk(url);
                sendError(req, res, 'Url not cached: ' + url);   
            }
            
        }
    }
};

var daysSince = 0;
function crawlSites() {
    var list = [];
    Object.keys(sites).forEach(function(site) {
        list.push(site);
    });
    function recur() {
        if (list.length) {
            debug('Crawling ' + list[list.length-1]);
            var site = list.pop();
            if (sites[site] && daysSince%sites[site] === 0)
                crawl(site).when(
                    function() {
                        //TODO remove changed cache files from memory
                        //so as not to serve stale files
                        debug('Done crawling ' + site);
                        recur(); 
                    });
            else recur();
        }
        else {
            daysSince ++;
            debug('Done crawling sites');   
        }
    }
    recur(); 
}


//crawl sites and set schedules to do it again 
//data goes to cache dir
var nsites = Object.keys(sites).length;
if (nsites && options.crawl && options.crawl.schedule) {
    var wait = Date.tomorrow().addHours(options.crawl.start || 3) - Date.now();
    setTimeout(function() {
        crawlSites();
        setInterval(crawlSites, 24 * 60 * 60 * 1000);
    }, wait);
}

if (options.crawl.now) crawlSites();



