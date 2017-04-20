const urlRegex = /(https?|ftp):\/\/[^\s/$.?#].[^\s\])]*/i;

document.querySelector('form').addEventListener('submit', e => {
	const url = document.querySelector('[name=url]').value;
	const [, id1, id2] = url.match(/comments\/(\w+)|^(\w+)$/) || []
	const id = id1 || id2;
	if (id) {
		fetchPost(id).then(populate);
	}
	e.preventDefault();
});

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}
function fetchAlbum(url) {
	const [,, album] = url.match(/\/(a|gallery)\/([^.]+)/) || []
	if (!album) {
		return url;
	}
	return fetch(`https://api.imgur.com/3/album/${album}/images`, {
		headers: new Headers(JSON.parse(atob('eyJBdXRob3JpemF0aW9uIjoiQ2xpZW50LUlEIDFhY2M4ZDFiMjk4YzZiYyJ9'))), // just unSEO
		mode: 'cors'
	})
	.then(r => r.json())
	.then(r => r.data.map(i => i.link));
}
function fetchPost(id) {
	return fetch(`https://www.reddit.com/comments/${id}.json`, {
		mode: 'cors'
	})
	.then(r => r.json())
	.then(r => 
		r[1].data.children
		.map(c => c.data.body)
		.filter(a => a)
		.map(b => b.match(urlRegex))
		.filter(a => a)
		.map(url => url[0])
	)
	.then(urls => urls.map(fetchAlbum))
	.then(mixed => Promise.all(mixed))
	.then(flatten)
	.then(urls => urls
		.map(url => /gfycat/.test(url) ? url.replace(/https?:\/\/gfycat/, 'https://giant.gfycat') + '.gif' : url)
		.map(url => url.replace(/https?:\/\/([im].)?imgur/, 'https://i.imgur'))
		.map(url => /\/[^.]+$/.test(url) ? url + '.jpg' : url)
	)
}
function populate(urls) {
	urls.forEach(url => {
		const img = new Image();
		img.src = url;
		document.body.appendChild(img);
	});
}
