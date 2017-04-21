import dotFinder from 'dot-finder';
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
	app.set({media: []});
	const [, id1, id2] = url.match(/comments\/(\w+)|^(\w+)$/) || [];
	const id = id1 || id2;
	if (!id) {
		app.set({state: `input-error`});
		return;
	}
	app.set({id});
	app.set({state: 'loading'});
	history.replaceState(history.state, document.title, `/?url=${id}`);

	fetchPost(id)
		.then(findMedia)
		.then(
			() => app.set({state: `done`}),
			() => app.set({state: `error`})
		);
});

function findMedia(response) {
	console.info('Raw JSON', response);
	const opId = response[0].data.children[0].data.id;
	const comments = dotFinder(response, '*.data.children.*.data');

	for (const comment of comments) {
		const urls = parseUrls(comment.body).filter(isWhitelisted);
		for (const url of new Set(urls)) {
			fetchAlbum(url).then(urls => urls.map(url => appendMedium({
				isVideo: url.endsWith('.gifv'),
				comment: `https://www.reddit.com/comments/${opId}/_/${comment.id}`,
				media: cleanUrl(url)
			})));
		}
	}
}

function appendMedium(medium) {
	const media = app.get('media');
	media.push(medium);
	app.set({
		media
	});
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

function isWhitelisted(url) {
	const is = /imgur.com|redd.it|gfycat.com/.test(url);
	console.log('URL found:', url, is ? '✅' : '❌');
	return is;
}

function cleanUrl(url) {
	if (/gfycat/.test(url)) {
		return url.replace(/https?:\/\/gfycat/, 'https://giant.gfycat') + '.gif';
	}
	url = url.replace(/https?:\/\/([im].)?imgur/, 'https://i.imgur');
	url = /\/[^.]+$/.test(url) ? url + '.jpg' : url;
	url = url.replace(/\.gifv$/, '.mp4');
	return url;
}

function fetchAlbum(url) {
	const [,, album] = url.match(/\/(a|gallery)\/([^.]+)/) || [];
	if (!album) {
		return Promise.resolve([url]);
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
	.then(r => r.json());
}
