import {basename,dirname,resolve} from 'node:path';
// Runtime files are not webpack assets. Support the app and repository CLI cwd.
export function workhubScanDirectory(cwd=process.cwd()){
 return resolve(cwd,basename(cwd)==='member'&&basename(dirname(cwd))==='apps'?'../../private-data':'private-data');
}
