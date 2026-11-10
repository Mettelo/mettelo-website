// Only member-facing review states: private reviewer notes never enter this model.
export function applicationStatus(status){
 switch(status){
 case 'new': case null: case undefined:return {label:'Received',message:'Your application is awaiting review. No action is needed yet.',action:'View application',href:null};
 case 'clarification':return {label:'Clarification needed',message:'Please contact Mettelo with your project reference to clarify your application. You can still view your original submission.',action:'Contact Mettelo',href:'/contact/'};
 case 'shortlisted':return {label:'Shortlisted',message:'Your application has been shortlisted. This is not an offer or a confirmed place. Check Mettelo Lab for any offers and their response deadlines.',action:'Check Mettelo Lab',href:'/member/lab'};
 case 'declined':return {label:'Not progressing',message:'This application is not progressing. You can explore other projects or contact Mettelo with a question.',action:'Explore projects',href:'projects'};
 case 'withdrawn':return {label:'Withdrawn',message:'This application is closed as withdrawn. Contact Mettelo if you believe this is incorrect.',action:'Contact Mettelo',href:'/contact/'};
 default:return {label:'Status unavailable',message:'Your application is recorded, but its latest review status could not be confirmed. Please reload or contact Mettelo.',action:'View application',href:null};
 }
}
