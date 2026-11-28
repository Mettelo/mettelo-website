import {mkdir,writeFile} from 'node:fs/promises';
import {evaluateAdzuna} from '../lib/opportunities/adzuna-evaluation.mjs';
try{
 const report=await evaluateAdzuna({appId:process.env.ADZUNA_APP_ID,appKey:process.env.ADZUNA_APP_KEY});
 const directory=new URL('../../../private-data/',import.meta.url);
 await mkdir(directory,{recursive:true});
 await writeFile(new URL('adzuna-coverage-evaluation.json',directory),JSON.stringify(report,null,2));
 const {samples,...summary}=report;
 console.log(JSON.stringify({...summary,sampleCount:samples.length,report:'private-data/adzuna-coverage-evaluation.json'},null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
