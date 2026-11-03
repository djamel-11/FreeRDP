import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { SOURCES } from '@/lib/exportEngine';
import { CONNECTORS } from '@/lib/connectors';
import { citiesText, cityCount, getCarrier } from '@/lib/carriers';
import { deleteCarrierAction, saveCarrierCities, saveCarrierCreds, saveCarrierMapping } from '../../actions';

export default async function CarrierPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; saved?: string; cities?: string; unmatched?: string }> }) {
  const me = await requireOwner(); const { t } = await getT();
  const { id } = await params; const sp = await searchParams;
  const c = getCarrier(me.workspaceId, Number(id)); if (!c) notFound();
  const conn = c.connector ? CONNECTORS[c.connector] : null;
  const unmatched = (sp.unmatched ?? '').split('|').filter(Boolean);
  return (<>
    <p><Link href="/carriers">‹ {t.carriers}</Link></p>
    <h1>{c.name} <span className={`badge ${conn ? 'confirmed' : ''}`}>{conn ? '⚡ ' + t.connected : '📄 ' + t.fileOnly}</span></h1>
    {sp.created && <div className="ok">{t.created}</div>}
    {sp.saved && <div className="ok">{t.saved}</div>}
    {sp.cities && <div className="ok">{t.citiesSaved}: {sp.cities}{unmatched.length > 0 && <div className="muted">{t.citiesUnmatched}: {unmatched.join(' · ')}</div>}</div>}

    <div className="card"><h2>{t.mappingTitle}</h2><p className="muted">{t.mappingHint}</p>
      <form action={saveCarrierMapping.bind(null, c.id)}>
        <div className="row"><div><label>{t.carrierName}</label><input name="name" defaultValue={c.name} maxLength={60} /></div>
          <div><label>{t.outputFmt}</label><select name="output" defaultValue={c.config.output}><option value="xlsx">Excel (.xlsx)</option><option value="csv">CSV</option></select></div></div>
        {c.config.columns.map((col) => (
          <div key={col.col} className="maprow"><div className="maphead" dir="auto"><b>{col.header}</b></div>
            <select name={'src_' + col.col} defaultValue={col.source}>{SOURCES.map((s) => <option key={s} value={s}>{(t as any)['src_' + s]}</option>)}</select>
            <input name={'fixed_' + col.col} defaultValue={col.fixed ?? ''} placeholder={t.src_fixed} aria-label={t.src_fixed} /></div>))}
        <p><button>{t.save}</button> <a className="btn sec" href={`/export?carrier=${c.id}&sample=1`}>⬇ {t.sampleFile}</a></p></form></div>

    <div className="card"><h2>{t.citiesTitle} ({cityCount(c.id)})</h2><p className="muted">{t.citiesHint}</p>
      {conn?.cityFor && <p className="muted">{t.citiesBuiltin}</p>}
      <form action={saveCarrierCities.bind(null, c.id)}><textarea name="cities" rows={6} dir="ltr" defaultValue={citiesText(c.id)} placeholder={'129,Casablanca\n49,Rabat\n98,Tanger'} />
        <p><button>{t.save}</button></p></form></div>

    {conn && <div className="card"><h2>{t.credsTitle}</h2>
      <form action={saveCarrierCreds.bind(null, c.id)}>
        {conn.fields.map((f) => (<div key={f.key}><label>{f.label}</label><input name={f.key} type={f.secret ? 'password' : 'text'} dir="ltr" autoComplete="off" placeholder={c.has_creds && f.secret ? '••••••••' : ''} /></div>))}
        <p><button>{t.save}</button></p></form></div>}

    <form action={deleteCarrierAction.bind(null, c.id)}><button className="danger">{t.deleteCarrier}</button></form>
  </>);
}
