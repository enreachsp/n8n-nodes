const path = require('path');
const { task, src, dest } = require('gulp');
const merge = require('merge-stream');

task('build:icons', copyIcons);

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	const credentialsSource = path.resolve('credentials', '*.{png,svg}');
	const credentialsDestination = path.resolve('dist', 'credentials');

	const nodeStream = src(nodeSource).pipe(dest(nodeDestination));
	const credentialsStream = src(credentialsSource).pipe(dest(credentialsDestination));

	return merge(nodeStream, credentialsStream);
}
