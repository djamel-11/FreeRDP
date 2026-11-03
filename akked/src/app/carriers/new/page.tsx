import Link from 'next/link';
import { requireOwner } from '@/lib/auth';
import { getT } from '@/lib/i18n';
import { connectorList } from '@/lib/connectors';
import { addConnectorCarrier, addFileCarrier } from '../../actions';

export default async function NewCarrier({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireOwner(); const { t } = await getT(); const sp = await searchParams;
  return (<><p><Link href="/carriers">‹ {t.carriers}</Link></p><h1>{t.newCarrier}</h1>
    {sp.error && <div className="err">{(t as any)['carrierErr_' + sp.error] ?? '✖'}</div>}
    <div className="card" id="upload" style={{ borderColor: 'var(--brand)', borderWidth: 2 }}><h2>📤 {t.uploadModel}</h2><p className="muted">{t.modelStepHint}</p>
      <form action={addFileCarrier}>
        <label>{t.carrierName}</label><input name="name" required maxLength={60} />
        <label>{t.uploadTemplate}</label><input type="file" name="template" accept=".xlsx,.csv,.txt" />
        <label>{t.orPasteHeaders}</label><textarea name="headers" rows={2} dir="ltr" placeholder="Nom, Téléphone, Ville, Adresse, Montant, Produit" />
        <p><button>{t.createBtn}</button></p></form></div>
    {connectorList().map((c) => (
      <div key={c.key} className="card"><h2>⚡ {c.name} <span className="muted">({t.fromConnector})</span></h2>
        <form action={addConnectorCarrier.bind(null, c.key)}>
          {c.fields.map((f) => (<div key={f.key}><label>{f.label}</label><input name={f.key} type={f.secret ? 'password' : 'text'} dir="ltr" autoComplete="off" required /></div>))}
          <p><button>{t.createBtn}</button></p></form></div>))}</>);
}
