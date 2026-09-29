// Throwaway Phase 1 prototype. Run npm.cmd run dev -- --host 127.0.0.1 --port 5176
// and open /topology-preview.html. Never submit to a backend.
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LanguageContext } from '@/contexts/LanguageContext'
import translations from '@/locales/en.json'
import { Button } from '@/shared/components/button/Button'
import { Field, Input, Select } from '@/shared/components/form/FormControls'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { SelectableCard } from '@/shared/components/selectable-card/SelectableCard'
import { WizardSteps } from '@/shared/components/wizard-steps/WizardSteps'
import { ResourceSelectionCard } from '@/shared/components/resource-selection/ResourceSelectionCard'
import { PolicySetPickerList } from '@/shared/components/policy-set-picker/PolicySetPickerList'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { Alert } from '@/shared/components/alert/Alert'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { RecoveryGroupDetailsStep } from '../components/RecoveryGroupDetailsStep'
import { policySets, stepLabels, storageProviders, vmVolumes } from './topologyPreviewData'
import '@/index.css'

export function TopologyPreview() {
  const [step, setStep] = useState(1)
  const [details, setDetails] = useState({ id: 'app02-mm', name: 'APP02 Recovery', description: 'Recovery configuration for production application workloads.' })
  const [topology, setTopology] = useState<'local' | 'metro_mirror' | null>(null)
  const [sourceId, setSourceId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [resourceType, setResourceType] = useState(false)
  const [compute, setCompute] = useState(false)
  const [vms, setVms] = useState<string[]>([])
  const [auxiliary, setAuxiliary] = useState<Record<string, string>>({})
  const [policyId, setPolicyId] = useState<string | null>(null)
  const [orchestrator, setOrchestrator] = useState('')
  const [deploy, setDeploy] = useState(false)
  const [review, setReview] = useState(false)
  const [dark, setDark] = useState(false)
  const source = storageProviders.find(provider => provider.id === sourceId)
  const partner = storageProviders.find(provider => provider.id === source?.partnerProviderId)
  const remote = topology === 'metro_mirror'
  const volumes = [...new Set(vms.flatMap(vm => vmVolumes[sourceId]?.[vm] ?? []))]
  const policy = policySets.find(item => item.id === policyId)
  const validations = [
    Boolean(details.id.trim() && details.name.trim() && details.description.trim()),
    Boolean(topology && source && (!remote || (partner && partner.id !== source.id && groupId.trim()))),
    resourceType, compute, vms.length > 0,
    volumes.length > 0 && (!remote || volumes.every(volume => auxiliary[volume]?.trim())),
    Boolean(policy), Boolean(orchestrator),
  ]
  const validThrough = (index: number) => validations.slice(0, index).every(Boolean)
  const payload = {
    ...details, provider_id_vm: compute ? 'vmware-vcenter-01' : '', provider_id_volume: sourceId,
    topology, ...(remote ? { metro_mirror: { mode: 'existing', consistency_group_id: groupId.trim() } } : {}),
    policy_set_id: policyId, vms: vms.map(name => ({ name })),
    volumes: volumes.map(name => ({ name, ...(remote ? { auxiliary_name: auxiliary[name]?.trim() ?? '' } : {}) })),
  }
  const selectTopology = (value: 'local' | 'metro_mirror') => {
    if (value !== topology) { setGroupId(''); setAuxiliary({}) }
    setTopology(value)
    setReview(false)
  }

  return (
    <LanguageContext.Provider value={{ language: 'en', setLanguage: () => undefined, translations }}>
      <div className={dark ? 'dark' : undefined}>
        <main className="min-h-screen bg-page p-4 text-text-primary sm:p-8">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
              <p className="text-sm text-text-muted">Phase 1 · Interaktívny návrh · Mock dáta, bez ukladania</p>
              <Button size="sm" variant="outline" onClick={() => { setDark(!dark) }}>{dark ? 'Svetlý režim' : 'Tmavý režim'}</Button>
            </div>
            <PageHeader eyebrow="Recovery plans" title="Create Recovery Group" description="Define your workloads, storage topology and recovery policies." />
            <div className="grid overflow-hidden rounded-[20px] border border-border bg-surface shadow-sm lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="min-w-0 border-b border-border bg-surface-subtle lg:border-b-0 lg:border-r">
                <WizardSteps items={stepLabels.map((label, index) => ({ id: label, label, disabled: !validThrough(index) }))} currentStep={step} ariaLabel="Recovery Group steps" onStepChange={value => { setStep(value); setReview(false) }} />
              </aside>
              <div className="flex min-w-0 flex-col">
                <div className="min-h-[540px] flex-1 p-5 sm:p-6">
                  {step === 1 && <RecoveryGroupDetailsStep {...details} existingIds={[]} onChange={update => { setDetails(current => ({ ...current, ...update })) }} />}
                  {step === 2 && <div className="grid max-w-3xl gap-5">
                    <div><h2 className="text-base font-semibold">Topology</h2><p className="mt-1 text-sm text-text-muted">Choose where FlashCopy point-in-time copies will be created.</p></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <SelectableCard title="Local" description="FlashCopy on the source FlashSystem." meta="Point-in-time copies on Source" selected={topology === 'local'} onClick={() => { selectTopology('local') }} />
                      <SelectableCard title="Metro Mirror" description="FlashCopy on existing auxiliary volumes on the partner FlashSystem." meta="Point-in-time copies on Target" selected={remote} onClick={() => { selectTopology('metro_mirror') }} />
                    </div>
                    {topology && <>
                      <Field label="Source FlashSystem *" htmlFor="topology-source">
                        <Select id="topology-source" value={sourceId} onChange={event => { setSourceId(event.target.value); setGroupId(''); setAuxiliary({}) }}>
                          <option value="">Select source FlashSystem</option>
                          {storageProviders.map(provider => <option key={provider.id} value={provider.id}>{provider.name} · {provider.ip}</option>)}
                        </Select>
                      </Field>
                      {remote && <>
                        {source && !partner && <Alert variant="error" title="No Metro Mirror partner configured for this FlashSystem." />}
                        {partner && <div className="rounded-xl border border-border bg-surface-subtle p-4">
                          <p className="text-xs font-medium text-text-muted">Target FlashSystem · Read only</p>
                          <p className="mt-1 text-sm font-semibold">{partner.name}</p>
                          <p className="mt-1 text-xs text-text-muted">{partner.ip} · Derived from partnerProviderId</p>
                        </div>}
                        <fieldset><legend className="mb-3 text-xs font-medium text-text-secondary">Metro Mirror mode</legend>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <SelectableCard title="Existing" description="Use existing Metro Mirror relationships." selected onClick={() => undefined} />
                            <SelectableCard title="Managed" description="Automatically manage Metro Mirror relationships." meta="Coming soon" selected={false} disabled />
                          </div>
                        </fieldset>
                        <div><Field label="Remote Copy Consistency Group ID *" htmlFor="topology-cg">
                          <Input id="topology-cg" value={groupId} placeholder="e.g. 1" required aria-describedby="cg-help" onChange={event => { setGroupId(event.target.value) }} />
                        </Field><p id="cg-help" className="mt-2 text-xs leading-5 text-text-muted">Existing IBM Remote Copy consistency group containing the Metro Mirror relationships used by this recovery group.</p></div>
                      </>}
                      <p className="rounded-lg bg-accent-soft p-3 text-sm leading-6 text-accent">{remote ? 'Source volumes → Metro Mirror → Auxiliary volumes on Target → FlashCopy → Point-in-time copies on Target' : 'Source volumes → FlashCopy → Point-in-time copies on Source'}</p>
                    </>}
                  </div>}
                  {step === 3 && <div className="grid max-w-3xl gap-5">
                    <div><h2 className="text-base font-semibold">Resource type</h2><p className="mt-1 text-sm text-text-muted">Choose the workloads to include in this recovery group.</p></div>
                    <SelectableCard title="VMware virtual machines" description="Protect virtual machines from a VMware vCenter provider." meta="Compute workloads" selected={resourceType} onClick={() => { setResourceType(true) }} />
                    <p className="text-xs text-text-muted">This prototype demonstrates the VMware flow with mock inventory.</p>
                  </div>}
                  {step === 4 && <div className="grid max-w-3xl gap-5">
                    <div><h2 className="text-base font-semibold">Compute provider</h2><p className="mt-1 text-sm text-text-muted">Select the provider hosting your virtual machines.</p></div>
                    <SelectableCard title="VMware vCenter Production" description="Production virtual machine inventory." meta="vmware-vcenter-01 · VMWARE" selected={compute} onClick={() => { setCompute(true) }} />
                  </div>}
                  {step === 5 && <div className="grid gap-5">
                    <div><h2 className="text-base font-semibold">Virtual machines</h2><p className="mt-1 text-sm text-text-muted">Select workloads from VMware vCenter Production.</p></div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <ResourceSelectionCard title="Available virtual machines" items={['APP01', 'APP02', 'DB01']} selectedItems={vms} emptyText="No virtual machines" removeLabel="Remove" ariaLabel="Available virtual machines" onResourceSelectionChange={(vm, selected) => {
                        setVms(current => selected ? [...new Set([...current, vm])] : current.filter(item => item !== vm))
                        setAuxiliary({})
                      }} />
                      <ResourceSelectionCard title="Selected virtual machines" items={vms} emptyText="Select virtual machines from the inventory." removeLabel="Remove" ariaLabel="Selected virtual machines" onResourceRemove={vm => { setVms(current => current.filter(item => item !== vm)); setAuxiliary({}) }} />
                    </div>
                  </div>}
                  {step === 6 && <div className="grid gap-5">
                    <div><h2 className="text-base font-semibold">Related storage</h2><p className="mt-1 text-sm text-text-muted">Source volumes discovered from {vms.join(', ')} on {source?.name}.</p></div>
                    {remote && <Alert title="Existing Metro Mirror volumes" description="Enter the existing auxiliary volume on the partner FlashSystem for every source volume. An auxiliary volume is a replica, not a FlashCopy snapshot." />}
                    {volumes.length === 0 ? <EmptyState title="No related volumes" description="Select virtual machines with source volumes." /> : remote ? <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="w-full text-left text-sm"><thead className="bg-surface-subtle text-text-muted"><tr><th className="p-4">Source volume</th><th className="p-4">Auxiliary volume · {partner?.name}</th></tr></thead>
                        <tbody>{volumes.map(volume => <tr key={volume} className="border-t border-border"><td className="p-4 font-medium">{volume}</td><td className="min-w-56 p-4"><Input aria-label={`Auxiliary volume for ${volume}`} placeholder={`DR_${volume}`} value={auxiliary[volume] ?? ''} required invalid={auxiliary[volume] !== undefined && !auxiliary[volume].trim()} onChange={event => { setAuxiliary(current => ({ ...current, [volume]: event.target.value })) }} /></td></tr>)}</tbody>
                      </table>
                    </div> : <ResourceSelectionCard title="Related volumes" items={volumes} emptyText="No related volumes" removeLabel="Remove" ariaLabel="Related volumes" />}
                    <p className="text-xs text-text-muted">{remote ? 'Every source volume requires an auxiliary name before continuing.' : 'FlashCopy will create point-in-time copies on the source FlashSystem.'}</p>
                  </div>}
                  {step === 7 && <div className="grid gap-5">
                    <div><h2 className="text-base font-semibold">Policy Set</h2><p className="mt-1 text-sm text-text-muted">Choose the policies applied to this recovery group.</p></div>
                    <div className="grid min-h-72 overflow-hidden rounded-xl border border-border lg:grid-cols-2">
                      <PolicySetPickerList policySets={policySets} selectedPolicySetId={policyId} recoveryPoliciesById={new Map([['daily', { name: 'Daily recovery verification' }]])} onSelect={setPolicyId} />
                      <div className="p-5">{policy ? <><h3 className="text-sm font-semibold">{policy.name}</h3><p className="mt-2 text-sm text-text-muted">{policy.description}</p><dl className="mt-5 grid gap-3 text-sm"><dt className="text-text-muted">Application recovery</dt><dd>Daily recovery verification</dd><dt className="text-text-muted">Clean room</dt><dd>Enforce clean target</dd></dl></> : <EmptyState title="Select a policy set" description="Its configuration will appear here." />}</div>
                    </div>
                  </div>}
                  {step === 8 && <div className="grid gap-5">
                    <div><h2 className="text-base font-semibold">Orchestration</h2><p className="mt-1 text-sm text-text-muted">Choose your orchestration settings.</p></div>
                    <div className="flex items-center gap-3 rounded-lg border border-border p-4"><Toggle checked={deploy} onChange={setDeploy} label="Deploy to orchestrator" /><span className="text-sm font-semibold">Deploy to orchestrator</span></div>
                    <Field label="Orchestration provider *" htmlFor="topology-orchestrator"><Select id="topology-orchestrator" value={orchestrator} onChange={event => { setOrchestrator(event.target.value); setReview(false) }}><option value="">Select provider</option><option value="airflow-01">Primary Airflow</option></Select></Field>
                    <div className="rounded-xl border border-border bg-surface-subtle p-5">
                      <h3 className="text-sm font-semibold">Review configuration</h3>
                      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[160px_minmax(0,1fr)]">
                        <dt className="text-text-muted">Topology</dt><dd>{remote ? 'Metro Mirror' : 'Local'}</dd>
                        <dt className="text-text-muted">Source FlashSystem</dt><dd>{source?.name}</dd>
                        {remote && <><dt className="text-text-muted">Target FlashSystem</dt><dd>{partner?.name}</dd><dt className="text-text-muted">Mode / Consistency Group</dt><dd>Existing / {groupId}</dd></>}
                        <dt className="text-text-muted">Compute provider</dt><dd>VMware vCenter Production</dd>
                        <dt className="text-text-muted">VMs</dt><dd>{vms.join(', ')}</dd>
                        <dt className="text-text-muted">Storage</dt><dd>{volumes.map(volume => <p key={volume} className="break-words">{volume}{remote ? ` → ${auxiliary[volume] ?? ''}` : ''}</p>)}</dd>
                        <dt className="text-text-muted">Policy</dt><dd>{policy?.name}</dd>
                      </dl>
                    </div>
                    {review && <><Alert variant="success" title="Preview complete — nothing was submitted" description="This is the reference payload for design review. Orchestration was not executed." /><pre className="overflow-x-auto rounded-xl border border-border p-4 text-xs" aria-label="Reference payload">{JSON.stringify(payload, null, 2)}</pre></>}
                  </div>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle p-4">
                  <Button variant="ghost" onClick={() => { setStep(1); setReview(false) }}>Back to Details</Button>
                  <div className="flex gap-3"><Button variant="outline" disabled={step === 1} onClick={() => { setStep(step - 1); setReview(false) }}>Back</Button>
                    <Button disabled={!validThrough(step)} onClick={() => { if (step < 8) setStep(step + 1); else setReview(true) }}>{step === 8 ? 'Preview payload' : 'Next'}</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </LanguageContext.Provider>
  )
}

const root = document.getElementById('root')
if (root && import.meta.env.DEV) createRoot(root).render(<TopologyPreview />)
