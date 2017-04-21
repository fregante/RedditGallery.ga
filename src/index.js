import App from './App.html';

const app = new App({
	target: document.body,
	data: {
		url: new URL(location).searchParams.get('url')
	}
});

app.observe('url', url => {
	if (!url) {
		return;
	}
	const [, id1, id2] = url.match(/comments\/(\w+)|^(\w+)$/) || [];
	const id = id1 || id2;
	if (!id) {
		alert('The post ID was not recognized: ' + url);
		return;
	}
	app.set({media: []});
	app.set({title: `Loading post ${id}...`});
	history.replaceState(history.state, document.title, `/?url=${id}`);
	return fetchPost(id).then(populate).then(
		() => app.set({title: `Showing images for post ${id}`}),
		() => app.set({title: `Loading of post ${id} failed`})
	);
});

function getUrlsMap(r) {
	const opId = r[0].data.children[0].data.id;

	return r[1].data.children
	.map(c => {
		const urls = parseUrls(c.data.body).filter(isWhitelisted);
		return urls.length === 0 ? null : {
			comment: `https://www.reddit.com/comments/${opId}/_/${c.data.id}`,
			images: urls
		};
	})
	.filter(identity);
}









const urlRegex = /(https?|ftp):\/\/[^\s/$.?#].[^\s\])]*/gi;

function parseUrls(body) {
	return matchAll(body, urlRegex).map(matches => matches[0]);
}

function matchAll(str, regex) {
	const res = [];
	let m;
	while (m = regex.exec(str)) {
		res.push(m);
	}
	return res;
}

function thenLog(p) {
	console.log(p);
	return p;
}

function flatten(arr) {
	return arr.reduce((flat, toFlatten) => {
		return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
	}, []);
}

function isWhitelisted(url) {
	const is = /imgur.com|redd.it|gfycat.com/.test(url);
	console.log('URL found:', url, is ? '✅' : '❌');
	return is;
}

function identity(a) {
	return a;
}

function parseAlbums(posts) {
	return posts.map(p => {
		const albums = p.images.map(fetchAlbum);
		return Promise.all(albums).then(urls => {
			p.images = cleanUrls(flatten(urls.filter(identity)));
			// Console.log(p.comment, p.images, albums);
			return p;
		}, err => console.error(err));
	});
}

function cleanUrls(urls) {
	return urls
		.map(url => /gfycat/.test(url) ? url.replace(/https?:\/\/gfycat/, 'https://giant.gfycat') + '.gif' : url)
		.map(url => url.replace(/https?:\/\/([im].)?imgur/, 'https://i.imgur'))
		.map(url => /\/[^.]+$/.test(url) ? url + '.jpg' : url);
}

function fetchAlbum(url) {
	const [,, album] = url.match(/\/(a|gallery)\/([^.]+)/) || [];
	if (!album) {
		return url;
	}
	return fetch(`https://api.imgur.com/3/album/${album}/images`, {
		headers: new Headers(JSON.parse(atob('eyJBdXRob3JpemF0aW9uIjoiQ2xpZW50LUlEIDFhY2M4ZDFiMjk4YzZiYyJ9'))), // Just unSEO
		mode: 'cors'
	})
	.then(r => r.json())
	.then(r => r.data.map(i => i.link))
	.catch(err => null);
}

function fetchPost(id) {
	return fetch(`https://www.reddit.com/comments/${id}.json`, {
		mode: 'cors'
	})
	.then(r => r.json())
	.then(thenLog)
	.then(getUrlsMap)
	.then(thenLog)
	.then(parseAlbums)
	.then(p => Promise.all(p));
}

function populate(comments) {
	comments.forEach(comment => {
		new Set(comment.images).forEach(url => {
			const medium = {
				isVideo: /\.gifv$/.test(url),
				url: comment.comment,
				src: url.replace(/\.gifv$/, '.mp4')
			};
			const media = app.get('media');
			media.push(medium);
			app.set({
				media
			});
		});
	});
}
