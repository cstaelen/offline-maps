export interface GeocodeHit {
  point: { lat: number; lng: number }
  name: string
  city?: string
  country?: string
  street?: string
  housenumber?: string
  postcode?: string
}

const GEOCODE_BASE = '/geocode/'

export async function geocode(query: string, lang = 'fr'): Promise<GeocodeHit[]> {
  if (!query.trim()) return []

  const url = new URL(GEOCODE_BASE + 'api', window.location.origin)
  url.searchParams.set('q', query)
  url.searchParams.set('lang', lang)

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Photon geocode failed: ${response.status}`)

  const geojson = await response.json()
  return (geojson.features ?? [])
    .map((f: any): GeocodeHit | null => {
      const coords = f?.geometry?.coordinates
      const props = f?.properties
      if (!Array.isArray(coords) || coords.length < 2 || !props?.name) return null
      return {
        point: { lat: coords[1], lng: coords[0] },
        name: props.name,
        city: props.city,
        country: props.country,
        street: props.street,
        housenumber: props.housenumber,
        postcode: props.postcode,
      }
    })
    .filter((hit: GeocodeHit | null): hit is GeocodeHit => hit !== null)
}
