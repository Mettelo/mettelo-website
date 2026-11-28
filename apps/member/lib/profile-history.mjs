export const historyFields={
 education_entries:[{key:'qualification',label:'Qualification or degree',max:160},{key:'institution',label:'School, college or university',max:200},{key:'subject',label:'Field of study',max:160},{key:'period',label:'Dates attended',max:80,placeholder:'2020–2024 or 2025–present'},{key:'description',label:'Description or achievements',max:1500,multiline:true}],
 experience_entries:[{key:'title',label:'Role or position',max:160},{key:'organisation',label:'Organisation or project',max:200},{key:'location',label:'Location or remote',max:120},{key:'period',label:'Dates',max:80,placeholder:'Jan 2024–present'},{key:'description',label:'Responsibilities and achievements',max:1500,multiline:true}]
};
export function validateHistory(value,kind){
 const fields=historyFields[kind];if(!fields||!Array.isArray(value)||value.length>20)throw Error('Add up to 20 entries in this section.');
 const ids=new Set();return value.map(entry=>{
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||Object.keys(entry).some(key=>key!=='id'&&!fields.some(f=>f.key===key)))throw Error('Check the entry details.');
  if(typeof entry.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entry.id)||ids.has(entry.id))throw Error('Reload this section before saving.');
  ids.add(entry.id);const result={id:entry.id};for(const field of fields){const raw=entry[field.key]??'';if(typeof raw!=='string'||raw.trim().length>field.max)throw Error(`Check ${field.label.toLowerCase()}.`);result[field.key]=raw.trim();}
  if(!fields.some(field=>result[field.key]))throw Error('Add some details or remove the empty entry.');return result;
 });
}
