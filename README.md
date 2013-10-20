seo_laundry
-----------------

Edit server/server.js to suit your needs.

Run the server:

    ./serve
	
Visit the url or make an ajax request to :

	http://serveraddress/?url="http://some_ajax_site/#!renderwithjsplease
	
You receive back the page passed in as the url parameter.

seo_laundry has phantomjs request and render the page, including the
javascript, to produce the html to return. 

TODO: periodically crawl a site using its sitemap, and/or spidering its links
TODO: cache results, in memory and on disk.
TODO: for now available sites are hardcoded, and unlimited (bogus) requests
can be made, this however can DoS the server and machine it runs on,
because phantomjs is not that fast. To remedy authentication needs to be
added, or a whitelist of urls needs to be used.
TODO: possibly even look for 
<meta name="fragment" content="!">
