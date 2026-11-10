import {publicWebsiteOrigin} from '@/lib/site-origins.mjs';
import {redirect} from 'next/navigation';
export default function Privacy(){redirect((publicWebsiteOrigin()+'/privacy/'));}
