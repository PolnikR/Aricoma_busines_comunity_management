// Prototype-only composition: shared controls, unchanged production drop-zone component.
import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Input } from '@/shared/components/form/FormControls'

interface AuxiliaryVolumeDropZoneProps {
  volumes: string[]
  auxiliary: Record<string, string>
  onAdd: (volume: string) => void
  onRemove: (volume: string) => void
  onChange: (volume: string, value: string) => void
}

export function AuxiliaryVolumeDropZone({ volumes, auxiliary, onAdd, onRemove, onChange }: AuxiliaryVolumeDropZoneProps) {
  const [dragging, setDragging] = useState(false)
  return (
    <section aria-label="Selected source volumes" className={`mt-3 flex h-[clamp(12rem,40dvh,24rem)] min-w-0 flex-col rounded-lg border border-border bg-surface-subtle p-2 ${dragging ? 'ring-1 ring-inset ring-focus' : ''}`}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; setDragging(true) }}
      onDragLeave={() => { setDragging(false) }}
      onDrop={event => { event.preventDefault(); setDragging(false); const volume = event.dataTransfer.getData('recovery-group-volume-name'); if (volume) onAdd(volume) }}>
      <div aria-hidden="true" className="grid shrink-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_2rem] gap-2 px-2 pb-2 text-xs text-text-muted"><span>Source</span><span>Auxiliary *</span><span /></div>
      <div className="custom-scrollbar min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {volumes.length === 0 ? <p className="p-4 text-center text-xs text-text-muted">Drop source volumes here.</p> : volumes.map(volume => (
          <div key={volume} className="grid min-w-0 grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_2rem] items-center gap-2 rounded-md border border-border bg-surface p-2">
            <span tabIndex={0} title={volume} aria-label={volume} className="group min-w-0 truncate text-xs text-text-primary focus:whitespace-normal focus:break-all focus:outline-none focus:ring-2 focus:ring-focus">
              <span aria-hidden="true" className="group-focus:hidden">{volume.length > 12 ? `${volume.slice(0,7)}…${volume.slice(-4)}` : volume}</span>
              <span aria-hidden="true" className="hidden group-focus:inline">{volume}</span>
            </span>
            <Input size="sm" aria-label={`Auxiliary volume for ${volume}`} placeholder="Auxiliary name" value={auxiliary[volume] ?? ''} required invalid={auxiliary[volume] !== undefined && !auxiliary[volume].trim()} onChange={event => { onChange(volume, event.target.value) }} />
            <Button size="sm" variant="ghost" className="px-0" aria-label={`Remove volume: ${volume}`} onClick={() => { onRemove(volume) }}>×</Button>
          </div>
        ))}
      </div>
    </section>
  )
}
