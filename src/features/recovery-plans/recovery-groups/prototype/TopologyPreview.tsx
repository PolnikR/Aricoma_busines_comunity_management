// Throwaway Phase 1 prototype. Run npm.cmd run dev -- --host 127.0.0.1 --port 5177
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
import { ResourceSidebar } from '@/shared/components/resource-sidebar/ResourceSidebar'
import { Card } from '@/shared/components/card/Card'
import { DataTable } from '@/shared/components/data-table/DataTable'
import { Badge } from '@/shared/components/badge/Badge'
import { PolicySetPickerList } from '@/shared/components/policy-set-picker/PolicySetPickerList'
import { Toggle } from '@/shared/components/toggle/Toggle'
import { Alert } from '@/shared/components/alert/Alert'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { RecoveryGroupDetailsStep } from '../components/RecoveryGroupDetailsStep'
import { policySets, stepLabels, storageProviders, vmVolumes } from './topologyPreviewData'
import '@/index.css'

export function TopologyPreview() {
  const storagePreview = new URLSearchParams(window.location.search).get('storage')
  const previewTopology = storagePreview === 'local' || storagePreview === 'metro_mirror' ? storagePreview : null
  const [step, setStep] = useState(previewTopology ? 6 : 1)
  const [details, setDetails] = useState({ id: 'app02-mm', name: 'APP02 Recovery', description: 'Recovery configuration for production application workloads.' })
  const [topology, setTopology] = useState<'local' | 'metro_mirror' | null>(previewTopology)
  const [sourceId, setSourceId] = useState(previewTopology ? 'ibm-flashsystem-prod' : '')
  const [groupId, setGroupId] = useState(previewTopology === 'metro_mirror' ? '1' : '')
  const [resourceType, setResourceType] = useState(Boolean(previewTopology))
  const [compute, setCompute] = useState(Boolean(previewTopology))
  const [vms, setVms] = useState<string[]>(previewTopology ? ['APP02'] : [])
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
  const mappedCount = volumes.filter(volume => auxiliary[volume]?.trim()).length
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
        <main className="flex h-dvh min-h-0 overflow-hidden bg-page p-3 text-text-primary sm:p-4">
          <div className="mx-auto flex min-h-0 w-full max-w-[1440px] flex-col">
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
              <p className="text-sm text-text-muted">Phase 1 · Interaktívny návrh · Mock dáta, bez ukladania</p>
              <Button size="sm" variant="outline" onClick={() => { setDark(!dark) }}>{dark ? 'Svetlý režim' : 'Tmavý režim'}</Button>
            </div>
            <PageHeader eyebrow="Recovery plans" title="Create Recovery Group" description="Define your workloads, storage topology and recovery policies." />
            <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-border bg-surface shadow-sm lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
              <aside className="custom-scrollbar min-h-0 min-w-0 overflow-y-auto border-b border-border bg-surface-subtle lg:border-b-0 lg:border-r">
                <WizardSteps items={stepLabels.map((label, index) => ({ id: label, label, disabled: !validThrough(index) }))} currentStep={step} ariaLabel="Recovery Group steps" onStepChange={value => { setStep(value); setReview(false) }} />
              </aside>
              <div className="flex min-h-0 min-w-0 flex-col">
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                  {step === 1 && <RecoveryGroupDetailsStep {...details} existingIds={[]} onChange={update => { setDetails(current => ({ ...current, ...update })) }} />}
                  {step === 2 && <div className="grid gap-4">
                    <div><h2 className="text-base font-semibold">Topology</h2><p className="mt-1 text-sm text-text-muted">Choose where FlashCopy point-in-time copies will be created.</p></div>
                    <Field label="Topology *" htmlFor="topology-mode">
                      <Select id="topology-mode" value={topology ?? ''} required onChange={event => {
                        const value = event.target.value
                        if (value === 'local' || value === 'metro_mirror') selectTopology(value)
                      }}>
                        <option value="" disabled>Select topology</option>
                        <option value="local">Local</option>
                        <option value="metro_mirror">Metro Mirror</option>
                      </Select>
                    </Field>
                    {topology && <>
                      <div className="grid min-w-0 gap-4 md:grid-cols-2">
                      <Field label="Source FlashSystem *" htmlFor="topology-source">
                        <Select id="topology-source" value={sourceId} onChange={event => { setSourceId(event.target.value); setGroupId(''); setAuxiliary({}) }}>
                          <option value="">Select source FlashSystem</option>
                          {storageProviders.map(provider => <option key={provider.id} value={provider.id}>{provider.name} · {provider.ip}</option>)}
                        </Select>
                      </Field>
                      {remote && <div className="min-w-0">
                        <Field label="Target FlashSystem · Read only" htmlFor="topology-target">
                          <Input id="topology-target" readOnly value={partner?.name ?? ''} placeholder="Derived from Source" aria-describedby="target-help" />
                        </Field>
                        <p id="target-help" className="mt-1 text-xs text-text-muted">{partner ? `${partner.ip} · Configured partner of Source` : 'Automatically resolved from the selected Source.'}</p>
                      </div>}
                      </div>
                      {remote && <>
                        {source && !partner && <Alert variant="error" title="No Metro Mirror partner configured for this FlashSystem." />}
                        <div className="grid min-w-0 gap-4 md:grid-cols-2">
                        <Field label="Metro Mirror mode" htmlFor="metro-mirror-mode">
                          <Select id="metro-mirror-mode" value="existing" onChange={() => undefined}>
                            <option value="existing">Existing</option>
                            <option value="managed" disabled>Managed — Coming soon</option>
                          </Select>
                        </Field>
                        <div><Field label="Remote Copy Consistency Group ID *" htmlFor="topology-cg">
                          <Input id="topology-cg" value={groupId} placeholder="e.g. 1" required aria-describedby="cg-help" onChange={event => { setGroupId(event.target.value) }} />
                        </Field><p id="cg-help" className="mt-2 text-xs leading-5 text-text-muted">Existing IBM Remote Copy consistency group containing the Metro Mirror relationships used by this recovery group.</p></div>
                        </div>
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
                    <div className="grid min-h-0 gap-4 lg:h-96 lg:grid-cols-[280px_minmax(0,1fr)]">
                      <div className="h-72 min-h-0 overflow-hidden rounded-lg border border-border lg:h-full">
                        <ResourceSidebar items={['APP01', 'APP02', 'DB01']} title="Available virtual machines" searchPlaceholder="Search virtual machines" loadingLabel="Loading virtual machines" noItemsLabel="No virtual machines" noMatchesLabel="No matching virtual machines" dragDataKey="recovery-group-resource-name" errorTitle="Unable to load resources" staleErrorTitle="Latest refresh failed" staleErrorDescription="Showing previous resources" retryLabel="Retry" />
                      </div>
                      <div className="flex h-72 min-h-0 flex-col rounded-lg border-2 border-dashed border-border bg-surface p-4 lg:h-full">
                        <h2 className="text-base font-semibold text-text-primary">Selected virtual machines</h2>
                        <p className="mt-1 text-sm text-text-muted">Drag virtual machines from the inventory into this group.</p>
                        <ResourceSelectionCard items={vms} emptyText="Drop virtual machines here." removeLabel="Remove" ariaLabel="Selected virtual machines" dropDataKey="recovery-group-resource-name" onResourceDrop={vm => {
                          if (['APP01', 'APP02', 'DB01'].includes(vm) && !vms.includes(vm)) {
                            setVms(current => [...current, vm])
                            setAuxiliary({})
                          }
                        }} onResourceRemove={vm => { setVms(current => current.filter(item => item !== vm)); setAuxiliary({}) }} className="mt-4 h-auto min-h-0 flex-1 rounded-lg border border-border" />
                      </div>
                    </div>
                  </div>}
                  {step === 6 && <div className="grid min-w-0 gap-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><h2 className="text-base font-semibold">Related storage</h2><p className="mt-1 text-sm text-text-muted">Volumes discovered from your selected virtual machines.</p></div>
                      <Badge color="light" size="sm">{remote ? 'Metro Mirror · Existing' : 'Local · FlashCopy'}</Badge>
                    </div>
                    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                      <Field label="Source FlashSystem" htmlFor="storage-source"><Input id="storage-source" value={source?.name ?? ''} readOnly /></Field>
                      {remote ? <Field label="Partner FlashSystem" htmlFor="storage-partner"><Input id="storage-partner" value={partner?.name ?? ''} readOnly /></Field> : <Field label="Snapshot location" htmlFor="storage-snapshot"><Input id="storage-snapshot" value="Source FlashSystem · FlashCopy" readOnly /></Field>}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                      <span>{volumes.length} source volumes · {vms.length} selected VMs{remote ? ` · Remote Copy group ${groupId}` : ''}</span>
                      <span role="status">{remote ? `${String(mappedCount)} of ${String(volumes.length)} auxiliary names entered` : 'Automatically discovered'}</span>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-xl border border-border">
                      <DataTable rows={volumes} rowKey={volume => volume} layout="fit" ariaLabel={remote ? 'Metro Mirror volume pairs' : 'Discovered source volumes'} density="comfortable" emptyContent={<EmptyState title="No related volumes" description="Select virtual machines with source volumes." />} columns={[
                        { id: 'source', header: 'Source volume', cell: volume => <div className="py-2"><p className="break-all font-medium text-text-primary">{volume}</p><p className="mt-1 text-xs text-text-muted">{vms.filter(vm => vmVolumes[sourceId]?.[vm]?.includes(volume)).join(', ')} · Discovered</p></div> },
                        remote
                          ? { id: 'auxiliary', header: 'Auxiliary volume on partner', cell: volume => <div className="grid min-w-0 gap-2 py-2"><Input aria-label={`Auxiliary volume for ${volume}`} placeholder={`DR_${volume}`} value={auxiliary[volume] ?? ''} required invalid={auxiliary[volume] !== undefined && !auxiliary[volume].trim()} onChange={event => { setAuxiliary(current => ({ ...current, [volume]: event.target.value })) }} /><div><Badge color={auxiliary[volume]?.trim() ? 'info' : 'warning'} size="sm">{auxiliary[volume]?.trim() ? 'Name entered' : 'Required'}</Badge></div></div> }
                          : { id: 'snapshot', header: 'Snapshot method', cell: () => <div><Badge color="light" size="sm">FlashCopy</Badge><p className="mt-1 text-xs text-text-muted">Point-in-time copy on Source</p></div> },
                      ]} />
                    </div>
                    <p className="text-xs leading-5 text-text-muted">{remote ? 'Enter the existing Metro Mirror replica name for each source volume. Auxiliary volumes are not snapshots; FlashCopy runs on the partner. Names are not checked against storage in this preview.' : 'Source volumes are discovered automatically. FlashCopy creates point-in-time copies on the same FlashSystem.'}</p>
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
                    <Card>
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
                    </Card>
                    {review && <><Alert variant="success" title="Preview complete — nothing was submitted" description="This is the reference payload for design review. Orchestration was not executed." /><pre className="overflow-x-auto rounded-xl border border-border p-4 text-xs" aria-label="Reference payload">{JSON.stringify(payload, null, 2)}</pre></>}
                  </div>}
                </div>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle p-3 sm:p-4">
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
