// Use pipeline provenance, never employer-name guesses, to group listings.
export function opportunitySourceGroup(source){
 if(source==='NHS Jobs')return 'nhs';
 if(typeof source==='string'&&/civil service/i.test(source))return 'civilservice';
 return 'other';
}
