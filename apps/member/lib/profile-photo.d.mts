export const profilePhotoLimit:number;
export function profilePhotoFileError(file:{type:string;size:number}|null|undefined):string;
export function profilePhotoStorageFailure(error:unknown):{status:number;message:string};
