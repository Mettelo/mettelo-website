import catalogue from './project-catalogue.snapshot.json';
export function websiteProject(id:string){return catalogue.find(project=>project.id.toLowerCase()===id.toLowerCase())||null;}
