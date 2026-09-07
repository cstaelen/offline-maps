import { useEffect } from 'react'
import Map from './components/Map'
import RouteLayer, { CLICKABLE_LAYER_IDS, useMapClickToAddPoint } from './components/RouteLayer'
import SearchBox from './components/SearchBox'
import RouteForm from './components/RouteForm'
import RouteDetails from './components/RouteDetails'
import RouteInstructions from './components/RouteInstructions'
import ThemeToggle from './components/ThemeToggle'
import GeolocateMarker from './components/GeolocateMarker'
import GeolocateButton from './components/GeolocateButton'
import { useThemeStore } from './store/useThemeStore'

export default function App() {
  const handleClick = useMapClickToAddPoint()
  const theme = useThemeStore(s => s.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="relative h-full overflow-auto">
      <div className="dark:bg-monokai-surface relative z-10 flex flex-col gap-2 p-2 w-full md:w-80 md:p-0">
        <div className="md:absolute w-full left-4 top-4 z-12 flex items-start gap-2 md:w-80">
          <SearchBox />
          <GeolocateButton />
        </div>
        <div className="md:absolute w-full left-4 top-16 z-10 space-y-2">
          <RouteForm />
          <RouteDetails />
          <RouteInstructions />
        </div>
      </div>
      <div className="absolute bottom-[10px] right-[10px] md:top-[90px] z-10">
        <ThemeToggle />
      </div>
      <div className="relative h-[100vh]">
      <Map onClick={handleClick} interactiveLayerIds={CLICKABLE_LAYER_IDS}>
        <RouteLayer />
        <GeolocateMarker />
      </Map>
      </div>
    </div>
  )
}
