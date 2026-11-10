'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <section className="newsEmpty"><h1>This article couldn’t be loaded.</h1><p>Please try again, or return to Industry News.</p><button className="newsButton" onClick={reset}>Try again</button> <a href="/industry-news">All stories</a></section>;}
