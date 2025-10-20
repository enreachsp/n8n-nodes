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

    const nodeWebSocketSource = path.resolve('nodes', 'EnreachWebSocket', '*.{png,svg}');
    const nodeWebSocketDest = path.resolve('dist', 'nodes', 'EnreachWebSocket');

    const credentialsSource = path.resolve('credentials', '*.{png,svg}');
    const credentialsDestination = path.resolve('dist', 'credentials');

    const nodeEnreachStream = src(nodeEnreachSource, { allowEmpty: true }).pipe(dest(nodeEnreachDest));
    const nodeTriggerStream = src(nodeTriggerSource, { allowEmpty: true }).pipe(dest(nodeTriggerDest));
    const nodeWebSocketStream = src(nodeWebSocketSource, { allowEmpty: true }).pipe(dest(nodeWebSocketDest));
    const credentialsStream = src(credentialsSource, { allowEmpty: true }).pipe(dest(credentialsDestination));

    return merge(nodeEnreachStream, nodeTriggerStream, nodeWebSocketStream, credentialsStream);
}