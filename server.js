var express = require('express');
var http = require('http');

var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var compress = require('compression');

var mustache = require('mustache');

var fs = require('fs');
var path = require('path');

var app;
var server;

//intro->setting->(event->reaction)+->end
var categories = ['candies', 'fireworks', 'birds', 'bananas', 'snakes', 'beachballs', 'popsicles'];
var stories = {
	intro: [
		'what can i say about *?',
		'want to hear about *?',
		'let me tell you a story about *',
		'so you think you know a little something about *?',
		'gather round and i shall tell you a tale'
	],
	setting: [
		'my friend sam gave me a couple *', 'it\'s not every day you come across box full of *',
		'i was on a normal stroll outside. out of nowhere, dozens of * start falling from the sky!',
		'i was driving to the shops one day, and when i turned the corner, there were hundreds of * blocking the road!'
	],
	event: [
		'let me tell ya, it\'s not always a good idea to eat all the *',
		'* are my favorite',
		'suddenly, the * EXPLODED!',
		'the * were every color of the rainbow!',
		'i tried to pick up all the *, but i couldn\'t hold them all!'
	],
	reaction: [
		'hooh boy did that make me holler!',
		'i couldn\'t believe this was happening!',
		'just what i needed!',
		'that made me very unhappy',
		'can you really trust *?'
	],
	end: [
		'and that is why * hold a special place in my heart.',
		'really makes you think',
		'what an experience!',
		'but all is well that ends well'
	]
};

function start(port, options) {
	var opts = Object.create(options || null);

	var templatePath = path.join(__dirname, '/test-app/templates');
	var templates = loadTemplates(templatePath);
	console.log('loaded templates in ' + templatePath);

	app = express();
	server = http.Server(app);

	app.use(compress());
	app.use(cookieParser());
	app.use(bodyParser.json());

	app.use('/', function(req, res, next) { setTimeout(function() { next(); }, 1000)});
	app.use('/', function(req, res, next) {
		if(req.cookies['fresh-quicklink-cache-control']) {
			var value = JSON.parse(req.cookies['fresh-quicklink-cache-control'])[req.url];
			if(value) {
				res.set('Cache-Control', value);
			}
		}
		//res.set('Cache-Control', 'max-age=30');
		next();
	});
	app.get('/styles.css', function(req, res, next) {
		res.set('Cache-Control', 'max-age=60');
		next();
	});
	app.get('/lib/quick-link.js', function(req, res, next) {
		res.set('Cache-Control', 'max-age=60');
		next();
	});

	app.get('/js.cookie.js', function(req, res) {
		res.set('Cache-Control', 'max-age=60');
		res.sendFile(path.join(__dirname, 'node_modules', 'js-cookie', 'src', 'js.cookie.js'));
	});

	app.use('/', express.static(path.join(__dirname, 'test-app/dist')));
	app.use('/lib', express.static(path.join(__dirname, '/lib')));

	app.get('/', function(req, res) {
		var rendered = renderLayout(templates['base.mustache'], req.params.category, templates['index.mustache'], {
			categories: categories.map(function(c) { return {category: c};})
		});
		res.send(rendered);
	});
	app.get('/categories/:category', function(req, res) {
		var rendered = renderLayout(templates['base.mustache'], req.params.category, templates['category.mustache'], {
			category: req.params.category,
			comparisons: categories.map(function(c) { return { otherCategory: c};}),
			description: 'everyone loves ' + req.params.category + '!'
		});
		res.send(rendered);
	});

	app.get('/comparisons/:category/:otherCategory', function(req, res) {
		var description = 'More is always better!';
		if(req.params.category !== req.params.otherCategory) {
			var c = [req.params.category, req.params.otherCategory];
			if(req.params.category > req.params.otherCategory) {
				c = [req.params.otherCategory, req.params.category];
			}
			if(c[0].length < c[1].length) {
				description = 'Don\'t mix these! YUCK!!!';
			}
			else if(c[0].length === c[1].length) {
				description = 'it won\'t knock your socks off';
			}
			else {
				description = 'The classic combination! You\'ll have a tough time beating ' + req.params.category + ' and ' + req.params.otherCategory;
			}
		}
		var rendered = renderLayout(templates['base.mustache'], req.params.category, templates['comparison.mustache'], {
			category: req.params.category,
			otherCategory: req.params.otherCategory,
			comparison: description
		});
		res.send(rendered);
	});

	app.get('/story/:category/:part', function(req, res) {
		var part = parseInt(req.params.part);
		var middleSections = Math.max(Math.floor(req.params.category.length/4), 1);
		var storyLength = 3 + 2*middleSections;
		var storyOffset = (req.params.category.charCodeAt(0)*(part+1))%13; //13 is a prime number

		function getPassage(part, length, offset) {
			var section = part%length;
			var passages = null;
			if(section === 0) {
				passages = stories.intro;
			}
			else if(section === 1) {
				passages = stories.setting;
			}
			else if(section === length - 1) {
				passages = stories.end;
			}
			else {
				passages = [stories.event, stories.reaction][(section - 2)%2];
			}
			return passages[offset % passages.length].replace('*', req.params.category);
		}

		var story = getPassage(part, storyLength, storyOffset);

		var rendered = renderLayout(templates['base.mustache'], req.params.category, templates['story.mustache'], {
			category: req.params.category,
			part: part+1,
			story: story,
			previousPart: part > 0 ? {value: part-1} : null,
			nextPart: part + 1
		});
		res.send(rendered);
	});

	server.listen(port);
	console.log('Listening on port ' + port);
}

function loadTemplates(dir) {
	return fs.readdirSync(dir).reduce(function(templates, file) {
		templates[file] = fs.readFileSync(path.join(dir, file), 'utf8');
		return templates;
	}, {});
}

//a "layout" is a wrapper template that has a "contents" value which is filled in by the template and view
function renderLayout(layout, title, template, view) {
	return mustache.render(layout, {title: title, contents: mustache.render(template, view)});
}

start(8080, {});
