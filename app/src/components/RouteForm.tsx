import { useEffect } from 'react'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Car, Bike, PersonStanding, X, GripVertical } from 'lucide-react'
import { useRouteStore } from '../store/useRouteStore'

const PROFILE_LABELS: Record<string, string> = {
  car: 'Voiture',
  bike: 'Vélo',
  foot: 'Marche',
}

const PROFILE_ICONS: Record<string, JSX.Element> = {
  car: <Car aria-hidden="true" className="h-4 w-4" />,
  bike: <Bike aria-hidden="true" className="h-4 w-4" />,
  foot: <PersonStanding aria-hidden="true" className="h-4 w-4" />,
}

function SortablePointItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <li ref={setNodeRef} style={style} className="flex items-center gap-2">
      <span {...attributes} {...listeners} className="cursor-grab text-slate-400" aria-label="Réordonner">
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </span>
      {children}
    </li>
  )
}

export default function RouteForm() {
  const points = useRouteStore(s => s.points)
  const profile = useRouteStore(s => s.profile)
  const availableProfiles = useRouteStore(s => s.availableProfiles)
  const status = useRouteStore(s => s.status)
  const errorMessage = useRouteStore(s => s.errorMessage)
  const route = useRouteStore(s => s.route)
  const selectedPathIndex = useRouteStore(s => s.selectedPathIndex)
  const selectPath = useRouteStore(s => s.selectPath)
  const loadProfiles = useRouteStore(s => s.loadProfiles)
  const setProfile = useRouteStore(s => s.setProfile)
  const removePoint = useRouteStore(s => s.removePoint)
  const reorderPoints = useRouteStore(s => s.reorderPoints)
  const clearPoints = useRouteStore(s => s.clearPoints)
  const selectedPath = route?.paths[selectedPathIndex]

  useEffect(() => {
    loadProfiles()
  }, [loadProfiles])

  if (availableProfiles.length === 0 && status === 'error') {
    return (
      <div className="w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 shadow dark:border-monokai-pink dark:bg-monokai-surface dark:text-monokai-pink">
        Routing service unavailable
      </div>
    )
  }

  return (
    <div className="w-full space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm shadow dark:border-monokai-border dark:bg-monokai-bg dark:text-monokai-text">
      <div className="flex gap-2">
        {availableProfiles.map(p => (
          <button
            key={p}
            onClick={() => setProfile(p)}
            title={PROFILE_LABELS[p] ?? p}
            aria-label={PROFILE_LABELS[p] ?? p}
            className={`flex items-center justify-center rounded px-2 py-1 text-xs font-medium ${
              p === profile
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 dark:bg-monokai-surface dark:text-monokai-muted'
            }`}
          >
            {PROFILE_ICONS[p] ?? <span className="text-xs font-medium">{p}</span>}
          </button>
        ))}
      </div>

      {points.length > 0 && (
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={(event: DragEndEvent) => {
            const { active, over } = event
            if (!over || active.id === over.id) return
            const fromIndex = points.findIndex(p => p.id === active.id)
            const toIndex = points.findIndex(p => p.id === over.id)
            if (fromIndex === -1 || toIndex === -1) return
            reorderPoints(fromIndex, toIndex)
          }}
        >
          <SortableContext items={points.map(p => p.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1">
              {points.map((point, i) => (
                <SortablePointItem key={point.id} id={point.id}>
                  <span className="flex-1 truncate">{point.label ?? `Point ${i + 1}`}</span>
                  <button
                    onClick={() => removePoint(point.id)}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Supprimer"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </SortablePointItem>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {status === 'loading' && <p className="text-slate-500">Calcul de l'itinéraire…</p>}
      {status === 'error' && errorMessage && <p className="text-red-600 dark:text-monokai-pink">{errorMessage}</p>}
      {selectedPath && status !== 'loading' && (
        <p className="text-slate-600 dark:text-monokai-muted">
          {(selectedPath.distance / 1000).toFixed(1)} km · {Math.round(selectedPath.time / 60000)} min
        </p>
      )}

      {route && route.paths.length > 1 && (
        <div className="flex flex-wrap gap-1">
          {route.paths.map((path, i) => (
            <button
              key={i}
              onClick={() => selectPath(i)}
              className={`rounded px-2 py-1 text-xs font-medium ${
                i === selectedPathIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 dark:bg-monokai-surface dark:text-monokai-muted'
              }`}
            >
              {i === 0 ? 'Principal' : `Alt. ${i}`} · {(path.distance / 1000).toFixed(1)} km
            </button>
          ))}
        </div>
      )}

      {points.length > 0 && (
        <button onClick={clearPoints} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-monokai-text">
          Tout effacer
        </button>
      )}
    </div>
  )
}
