import {advanceWorkhubScan} from '../lib/opportunities/workhub-scan-store.mjs';
try{console.log(JSON.stringify({...await advanceWorkhubScan(),scope:'GRS adverts matching selected keywords; not all departments. Read-only scan; no publication.'}));}
catch(error){console.error(error.message);process.exitCode=1;}
