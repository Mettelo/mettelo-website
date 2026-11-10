import PublicHeader from '../PublicHeader';
import type {HeaderAccount} from '../AccountMenu';
export default function PublicNewsChrome({children,account,footer}:{children:React.ReactNode;account:HeaderAccount|null;footer:React.ReactNode}){
 return <div className="newsPublic"><a href="#news-main" className="newsSkip">Skip to content</a><PublicHeader account={account}/><main id="news-main" tabIndex={-1}>{children}</main>{footer}</div>;
}
