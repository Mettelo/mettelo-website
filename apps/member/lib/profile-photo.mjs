export const profilePhotoLimit=5*1024*1024;
export function profilePhotoFileError(file){
 if(!file)return 'Choose a photo first.';
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Choose a JPG, PNG or WebP photo.';
 if(!file.size)return 'This file is empty. Choose another photo.';
 if(file.size>profilePhotoLimit)return 'Choose a photo no larger than 5 MB.';
 return '';
}
export function profilePhotoStorageFailure(error){
 const status=Number(error?.statusCode||error?.status);
 if(status===401||status===403)return {status:403,message:'Your account could not save this photo. Sign in again and retry. If this continues, contact support.'};
 if(status===413)return {status:413,message:'This photo could not fit the upload limit. Choose a smaller image.'};
 if(status===429)return {status:429,message:'Photo uploads are busy. Wait a moment and try again.'};
 return {status:503,message:'The photo service is temporarily unavailable. Your existing photo has not changed. Please try again.'};
}
