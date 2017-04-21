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

function init() {
	const deepLink = new URL(location).searchParams.get('url');
	if (deepLink) {
		handleUrl(deepLink);
	}

	document.querySelector('form').addEventListener('submit', e => {
		const url = document.querySelector('[name=url]').value;
		if (!handleUrl(url)) {
			alert('The post ID was not recognized: ' + url);
		}
		e.preventDefault();
	});
}

function updateTitle(title) {
	document.querySelector('h1').textContent = title;
}

function handleUrl(url) {
	const [, id1, id2] = url.match(/comments\/(\w+)|^(\w+)$/) || [];
	const id = id1 || id2;
	if (id) {
		[...document.querySelectorAll('img,video')].forEach(el => el.remove());
		updateTitle(`Loading post ${id}...`);
		history.replaceState(history.state, document.title, `/?url=${id}`);
		return fetchPost(id).then(populate).then(
			() => updateTitle(`Showing images for post ${id}`),
			() => updateTitle(`Loading of post ${id} failed`)
		);
	}
	return false;
}

function flatten(arr) {
	return arr.reduce((flat, toFlatten) => {
		return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
	}, []);
}

function isWhitelisted(url) {
	const is = /imgur.com|redd.it|gfycat.com/.test(url);
	console.log('URL found:', url, is ? '✅' : '❌')
	return is;
}

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

function identity(a) {
	return a;
}

function parseAlbums(posts) {
	return posts.map(p => {
		const albums = p.images.map(fetchAlbum);
		return Promise.all(albums).then(urls => {
			p.images = cleanUrls(flatten(urls.filter(identity)));
			// console.log(p.comment, p.images, albums);
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
	console.info(comments)
	const content = document.querySelector('.content');
	comments.forEach(comment => {
		new Set(comment.images).forEach(url => {
			const media = document.createElement(/\.gifv$/.test(url) ? 'video' : 'img');
			media.src = url.replace(/\.gifv$/, '.mp4');
			media.autoplay = true;
			const a = document.createElement('a');
			a.href = comment.comment;
			a.target = '_blank';
			a.appendChild(media);
			content.appendChild(a);
		});
	});
}

init();
