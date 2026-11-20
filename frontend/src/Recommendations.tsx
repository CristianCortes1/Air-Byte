import { hora, numero } from './api'
import type { CurrentData } from './Current'

export default function Recommendations({ data }: { data?: CurrentData }) {
  const low = data?.estado === 'ok' && data.horas.length
    ? data.horas.reduce((best, point) => point.pm25 < best.pm25 ? point : best)
    : undefined

  return <section className="panel recommendations" aria-labelledby="recommendations-title">
    <div className="recommendations-heading"><span className="recommendations-symbol" aria-hidden="true">✳</span>
      <div><h2 id="recommendations-title">Recomendaciones ciudadanas</h2><p>Ideas para consultar y cuidar el aire de tu entorno.</p></div>
      <span className="recommendations-tag">BOGOTÁ</span>
    </div>
    <div className="recommendation-list">
      <article className="recommendation">
        <span className="recommendation-icon activity-icon" aria-hidden="true">↗</span>
        <div><h3>Planea tus actividades al aire libre</h3>
          <p>{low
            ? `La menor concentración estimada para esta estación es ${numero.format(low.pm25)} µg/m³, a las ${hora(low.hora)}. Contrasta el pronóstico con las alertas oficiales.`
            : 'Consulta la curva de las próximas 24 horas y las alertas oficiales antes de planear una actividad al aire libre.'}</p>
        </div>
      </article>
      <article className="recommendation">
        <span className="recommendation-icon home-icon" aria-hidden="true">⌂</span>
        <div><h3>Ventila según las condiciones</h3>
          <p>Usa las horas con menor PM2,5 estimado como referencia y considera el entorno inmediato, como humo u otras fuentes cercanas.</p>
        </div>
      </article>
      <article className="recommendation">
        <span className="recommendation-icon official-icon" aria-hidden="true">◎</span>
        <div><h3>Consulta la información oficial</h3>
          <p>Este pronóstico es orientativo. Revisa IBOCA para conocer el nivel de riesgo y las recomendaciones vigentes en Bogotá.</p>
        </div>
      </article>
    </div>
    <a className="recommendations-source" href="https://iboca.ambientebogota.gov.co/mapa/" target="_blank" rel="noreferrer">
      Fuente: Secretaría Distrital de Ambiente · IBOCA <span aria-hidden="true">↗</span>
    </a>
  </section>
}
