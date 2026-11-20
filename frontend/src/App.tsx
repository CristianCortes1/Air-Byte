import { useEffect, useRef, useState } from 'react'
import { api, hora, numero } from './api'
import Current, { type CurrentData } from './Current'
import LocalityMap, { MapLegend } from './LocalityMap'
import StationDetail from './StationDetail'
import { SiteFooter, SiteHeader } from './SiteChrome'
import './App.css'

type Station = { slug: string; nombre: string; localidad: string; localidad_nombre?: string; latitud: number; longitud: number; desde: string | null; hasta: string | null }
type Reading = { hora: string; pm25: number; unidad: string }
type Result = { estado: string; emision: string; medicion: (Reading & { antiguedad_minutos: number }) | null;
  pronostico: Reading | null; evaluacion?: { hora_observada: string; pm25_observado: number | null } }
const localityLabels: Record<string, string> = {
  kennedy: 'Kennedy', 'puente-aranda': 'Puente Aranda', tunjuelito: 'Tunjuelito', usaquen: 'Usaquén',
}

function preferredStation() {
  try { return localStorage.getItem('airbyte-estacion') || 'tunal' }
  catch { return 'tunal' }
}

export default function App() {
  const [historical, setHistorical] = useState(false)
  const [stations, setStations] = useState<Station[]>([])
  const [station, setStation] = useState(preferredStation)
  const [pinnedStation, setPinnedStation] = useState(preferredStation)
  const [refreshKey, setRefreshKey] = useState(0)
  const [month, setMonth] = useState('2025-01')
  const [available, setAvailable] = useState<string[]>([])
  const [time, setTime] = useState('2025-01-01T01:00:00-05:00')
  const [evaluate, setEvaluate] = useState(true)
  const [result, setResult] = useState<Result>()
  const [currentData, setCurrentData] = useState<CurrentData>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    let active = true
    api<{ resultados: Station[] }>('/estaciones').then(data => {
      if (!active) return
      setStations(data.resultados)
      const fallback = data.resultados.find(item => item.slug === 'tunal')?.slug ?? data.resultados[0]?.slug ?? 'tunal'
      setStation(current => data.resultados.some(item => item.slug === current) ? current : fallback)
      setPinnedStation(current => data.resultados.some(item => item.slug === current) ? current : '')
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!historical) return
    let active = true
    api<{ horas: string[] }>('/estaciones/' + station + '/disponibilidad?mes=' + month)
      .then(data => {
        if (!active) return
        setAvailable(data.horas)
        setTime(current => data.horas.includes(current) ? current : (data.horas[0] ?? ''))
      }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [station, month, historical])

  async function consult() {
    const id = ++requestId.current
    const params = new URLSearchParams({ estacion: station, emision: time, evaluar: String(evaluate) })
    setBusy(true)
    setError('')
    setResult(undefined)
    try {
      const data = await api<Result>('/consulta?' + params)
      if (id === requestId.current) setResult(data)
    } catch (e) { if (id === requestId.current) setError((e as Error).message) }
    finally { if (id === requestId.current) setBusy(false) }
  }

  const selected = stations.find(item => item.slug === station)
  const stationData = currentData?.estacion === station ? currentData : undefined
  const live = Boolean(stationData?.medicion && stationData.medicion.antiguedad_minutos < 180)

  function changeStation(slug: string) {
    setCurrentData(undefined)
    setAvailable([])
    setStation(slug)
  }

  function pinStation() {
    try { localStorage.setItem('airbyte-estacion', station) } catch { /* El cambio sigue activo en esta página. */ }
    setPinnedStation(station)
  }

  return <>
    <SiteHeader />
    <main className="dashboard-main">
      <section id="consulta" aria-labelledby="dashboard-title">
        <h1 className="visually-hidden" id="dashboard-title">Calidad del aire en Bogotá</h1>
        <div className="station-strip">
          <label className="station-picker"><span className="station-picker-label">Estación de monitoreo</span>
            <select value={station} onChange={event => changeStation(event.target.value)}>
              {stations.map(item => <option key={item.slug} value={item.slug}>{item.nombre}</option>)}
            </select>
          </label>
          <div className="station-live" aria-live="polite"><span className={`live-dot ${live ? '' : 'is-offline'}`} />
            <span><strong>{live ? 'RMCAB · EN VIVO' : stationData?.estado === 'lectura_atrasada' ? 'RMCAB · LECTURA ATRASADA' : stationData?.estado === 'modelo_no_disponible' ? 'RMCAB · MODELO NO DISPONIBLE' : 'RMCAB · CONSULTANDO'}</strong>
              <small>{stationData?.medicion ? `Último dato · hace ${stationData.medicion.antiguedad_minutos} min` : 'Red de monitoreo de Bogotá'}</small></span>
          </div>
          <div className="station-facts">
            <span><small>LOCALIDAD</small><strong>{selected?.localidad_nombre ?? localityLabels[selected?.localidad ?? ''] ?? 'Bogotá D.C.'}</strong></span>
            <span><small>FUENTE</small><strong>RMCAB</strong></span>
            <span><small>PRONÓSTICO</small><strong>24 HORAS</strong></span>
          </div>
          <button className="refresh-button" type="button" aria-label="Actualizar medición" title="Actualizar medición"
            onClick={() => { setCurrentData(undefined); setRefreshKey(value => value + 1) }}>
            <span aria-hidden="true">⟳</span>
          </button>
        </div>

        <div className="view-toolbar">
          <span className="view-toolbar-label">Calidad del aire · Bogotá D.C.</span>
          <div className="mode-switch" role="tablist" aria-label="Vista de calidad del aire">
            <button role="tab" aria-selected={!historical} aria-pressed={!historical} onClick={() => setHistorical(false)}>En vivo</button>
            <button role="tab" aria-selected={historical} aria-pressed={historical} onClick={() => setHistorical(true)}>Histórico</button>
          </div>
        </div>

        {!historical ? <Current key={`${station}-${refreshKey}`} station={station} label={selected?.nombre ?? 'Tunal'} onData={setCurrentData} />
          : <section className="historical-panel panel" aria-label="Consulta histórica">
            <form className="filters" onSubmit={event => { event.preventDefault(); void consult() }}>
              <label>Estación<select value={station} onChange={event => changeStation(event.target.value)}>
                {stations.map(item => <option key={item.slug} value={item.slug}>{item.nombre}</option>)}
              </select></label>
              <label>Mes de consulta<input type="month" required value={month}
                onChange={event => { setAvailable([]); setMonth(event.target.value) }} /></label>
              <label>Hora en Bogotá<select value={time} onChange={event => setTime(event.target.value)}>
                {available.length === 0 && <option value="">Sin horas disponibles</option>}
                {available.map(value => <option key={value} value={value}>{hora(value)}</option>)}
              </select></label>
              <button disabled={!available.length || busy}>{busy ? 'Consultando…' : 'Consultar'}</button>
              <label className="check"><input type="checkbox" checked={evaluate} onChange={event => setEvaluate(event.target.checked)} /> Mostrar medición posterior</label>
            </form>
            {error && <p role="alert">{error}</p>}
            {result && <div aria-live="polite">
              <p>Emisión histórica · {hora(result.emision)}</p>
              <div className="metrics">
                <div><h3>{result.medicion?.antiguedad_minutos ? 'Última medición disponible' : 'Medición oficial'}</h3>
                  {result.medicion ? <><strong>{numero.format(result.medicion.pm25)} <small>µg/m³</small></strong><p>{hora(result.medicion.hora)}</p>
                    {result.medicion.antiguedad_minutos > 0 && <p>{result.medicion.antiguedad_minutos} minutos antes de la emisión</p>}</> : <p>Sin lectura previa</p>}</div>
                <div><h3>Pronóstico horario</h3>{result.pronostico ? <><strong>{numero.format(result.pronostico.pm25)} <small>µg/m³</small></strong><p>{hora(result.pronostico.hora)}</p></> : <p>Sin pronóstico para esta hora</p>}</div>
                {result.evaluacion && <div><h3>Observado al día siguiente</h3><strong>{result.evaluacion.pm25_observado === null ? 'Sin lectura' : numero.format(result.evaluacion.pm25_observado) + ' µg/m³'}</strong><p>{hora(result.evaluacion.hora_observada)}</p></div>}
              </div>
              <p>El modelo tiende a subestimar picos de concentración.</p>
            </div>}
          </section>}

        <section className="map-panel panel" aria-labelledby="map-title">
          <div className="map-heading">
            <div><span className="eyebrow">AIR-BYTE · BOGOTÁ D.C.</span><h2 id="map-title">Cartografía de partículas por localidad</h2>
              <p>Dispersión espacial de PM2,5 en la cuenca urbana del Distrito Capital.</p></div>
            <MapLegend />
          </div>
          <div className="map-content">
            <div className="map-column">
              <LocalityMap stations={stations} selected={station} select={changeStation} />
              <p className="map-source">Límites de localidades · <a href="https://mapas.gobiernobogota.gov.co/waserver/rest/services/Mapa_Base/MapServer/4" target="_blank" rel="noreferrer">IDECA</a></p>
            </div>
            <StationDetail station={selected} data={stationData} onPin={pinStation} pinned={pinnedStation === station} />
          </div>
        </section>
      </section>
    </main>
    <SiteFooter />
  </>
}
