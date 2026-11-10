import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {redirect} from 'next/navigation';
export default function Terms(){redirect((publicWebsiteOrigin()+'/terms/'));}
