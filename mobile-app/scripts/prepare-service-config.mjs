// Local preparation only. Does not resolve DNS, contact a service, or build/run Flutter.
import {writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {validateServiceConfig} from './service-config.mjs';
const args=process.argv.slice(2),options=new Map();
for(let i=0;i<args.length;i+=2){if(!['--environment','--origin','--image-hosts','--media-hosts'].includes(args[i])||!args[i+1]||options.has(args[i]))throw Error('Supply --environment, --origin and optionally --image-hosts / --media-hosts. No secrets are accepted.');options.set(args[i],args[i+1]);}
const environment=options.get('--environment');if(!['development','staging','production'].includes(environment))throw Error('Explicit environment required.');
const settings=validateServiceConfig({HOMEZONE_ENABLE_API:true,HOMEZONE_API_ENV:environment,HOMEZONE_API_BASE_URL:options.get('--origin')?.replace(/\/$/,''),HOMEZONE_IMAGE_HOSTS:options.get('--image-hosts')??'',HOMEZONE_MEDIA_HOSTS:options.get('--media-hosts')??''});
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),folder=resolve(root,'config'),path=resolve(folder,`${environment}.local.json`);
if(existsSync(path))throw Error('Configuration already exists. Review it locally; this script does not overwrite it.');
const serialized=JSON.stringify(settings,null,2)+'\n';
if(Buffer.byteLength(serialized)>4096)throw Error('Nonsecret configuration must fit the Android build wrapper 4 KiB limit.');
mkdirSync(folder,{recursive:true});writeFileSync(path,serialized,{flag:'wx',mode:0o600});
process.stdout.write(`Prepared config/${environment}.local.json. No service connection or build was performed.\n`);
