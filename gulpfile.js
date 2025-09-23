const path = require('path');
const { task, src, dest } = require('gulp');
const merge = require('merge-stream');

task('build:icons', copyIcons);

function copyIcons() {
	// Copier les icônes des nodes en préservant la structure complète des dossiers
	const nodeEnreachSource = path.resolve('nodes', 'Enreach', '*.{png,svg}');
	const nodeEnreachDest = path.resolve('dist', 'nodes', 'Enreach');

	const nodeTriggerSource = path.resolve('nodes', 'EnreachTrigger', '*.{png,svg}');
	const nodeTriggerDest = path.resolve('dist', 'nodes', 'EnreachTrigger');

	const nodeToolSource = path.resolve('nodes', 'EnreachTool', '*.{png,svg}');
	const nodeToolDest = path.resolve('dist', 'nodes', 'EnreachTool');

	const credentialsSource = path.resolve('credentials', '*.{png,svg}');
	const credentialsDestination = path.resolve('dist', 'credentials');

	const nodeEnreachStream = src(nodeEnreachSource).pipe(dest(nodeEnreachDest));
	const nodeTriggerStream = src(nodeTriggerSource).pipe(dest(nodeTriggerDest));
	const nodeToolStream = src(nodeToolSource).pipe(dest(nodeToolDest));
	const credentialsStream = src(credentialsSource).pipe(dest(credentialsDestination));

	return merge(nodeEnreachStream, nodeTriggerStream, nodeToolStream, credentialsStream);
}
