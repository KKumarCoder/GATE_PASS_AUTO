import './app-loader.css';

export default function AppLoader({inline=false,label='Loading school records…'}) {
  return <span className={`app-loader${inline?' app-loader-inline':''}`} role="status" aria-label={label}>
    <span className="app-loader-art" aria-hidden="true">
      <span className="app-loader-halo"/>
      <span className="app-loader-tiles">
        <span/><span/><span/><span/>
      </span>
    </span>
    {!inline&&<><span className="app-loader-caption">{label}</span><span className="app-loader-dots" aria-hidden="true"><i/><i/><i/></span></>}
  </span>;
}
