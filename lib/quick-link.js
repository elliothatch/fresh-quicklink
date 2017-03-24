(function(window) {

	Cookies.set('fresh-quicklink-cache-control', {});

	var defaultTtl = 120 * 60;
	getPrefetchUrls().forEach(function(url) {
		prefetchUrl(url, defaultTtl);
	});

	function prefetchUrl(url, ttl) {
		var cookie = Cookies.getJSON('fresh-quicklink-cache-control');
		cookie[url] = 'max-age=' + ttl;
		Cookies.set('fresh-quicklink-cache-control', cookie);

		var link = window.document.createElement('link');
		link.setAttribute('rel', 'prefetch');
		link.setAttribute('href', url);
		link.onload = function() {
			var cookie = Cookies.getJSON('fresh-quicklink-cache-control');
			delete cookie[url];
			Cookies.set('fresh-quicklink-cache-control', cookie);
		};
		window.document.getElementsByTagName('head')[0].appendChild(link);
	}

	function isBlacklisted(element) {
		if (!element.hasAttribute || element.hasAttribute('data-fresh-quicklink')) { // Parent of <html>
			return false;
		}
		if (element.hasAttribute('data-fresh-no-quicklink')) {
			return true;
		}

		if(!element.parentNode) {
			return false;
		}

		return isBlacklisted(element.parentNode);
	}

	function isPreloadable(linkElement) {
		var domain = location.protocol + '//' + location.host;
		return !(linkElement.target
				|| linkElement.href.indexOf(domain + '/') !== 0 // only same-origin links
				|| (linkElement.href.indexOf('#') > -1 && removeHash(linkElement.href) === removeHash(location.href)) // no same-page anchors
				|| isBlacklisted(linkElement));
	}

	//returns a list of urls that should be prefetched
	function getPrefetchUrls() {
		return Array.from(window.document.getElementsByTagName('a'))
			.filter(function(linkElement) {
				return isPreloadable(linkElement);
			}).map(function(linkElement) {
				var domain = location.protocol + '//' + location.host;
				return linkElement.href.substring(domain.length);
			});
	}

	function removeHash(url) {
		var index = url.indexOf('#');
		if (index === -1) {
			return url;
		}

		return url.substr(0, index);
	}
})(window)
