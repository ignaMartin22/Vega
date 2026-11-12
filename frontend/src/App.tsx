import { useEffect, useState } from "react";
import type { OnchainMeasurement } from "@vega/shared";
import { dataSource, wetlands as sampleWetlands } from "./data/source";
import type { WetlandFeature } from "./data/source";
import { GeoJsonAnalysis } from "./components/GeoJsonAnalysis";
import { WetlandMap } from "./components/WetlandMap";
import { NdwiChart } from "./components/NdwiChart";
import { VerifyButton } from "./components/VerifyButton";

function Mark() {
  return <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none"><path d="M20 4C14 13 8 19 8 25a12 12 0 0 0 24 0c0-6-6-12-12-21Z" stroke="currentColor" strokeWidth="1.8"/><path d="M13 26c4 0 7-2 9-6 2 4 5 6 9 6M20 20v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></span>;
}

function LandingIntro() {
  return (
    <>
      <header className="site-header">
        <a className="brand-lockup" href="#inicio" aria-label="SATY, inicio"><Mark /><span><strong>SATY</strong><small>AGUA · CIENCIA · TERRITORIO</small></span></a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#plataforma">Plataforma</a><a href="#metodo">Cómo funciona</a><a href="#piloto">Área piloto</a>
        </nav>
        <a className="nav-cta" href="#workspace">Explorar plataforma <span aria-hidden="true">↗</span></a>
      </header>
      <div className="landing-main" id="inicio">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-dot" /> MONITOREO AMBIENTAL · PUNA ARGENTINA</p>
            <h1>Hacer visible<br/>lo que el agua<br/><em>sostiene.</em></h1>
            <p className="hero-lead">Tecnología satelital y evidencia verificable para comprender la dinámica de los humedales altoandinos.</p>
            <div className="hero-actions"><a className="button-primary" href="#workspace">Explorar la plataforma <span>↗</span></a><a className="text-link" href="#metodo">Conocer el método <span>↓</span></a></div>
            <div className="hero-proof"><span className="proof-mark">◎</span><span>Datos geoespaciales · Series temporales · Trazabilidad</span></div>
          </div>
          <div className="hero-art" aria-label="Representación abstracta de un humedal altoandino">
            <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
            <div className="art-sun"/><div className="art-mountain mountain-back"/><div className="art-mountain mountain-front"/>
            <div className="art-saltflat"><span/><span/><span/></div>
            <div className="art-coordinate"><small>ALTIPLANO ANDINO</small><strong>SISTEMAS DE ALTURA</strong></div>
            <div className="art-caption"><span className="live-dot"/> SISTEMAS HÍDRICOS · PUNA</div>
          </div>
          <div className="hero-index"><span>01 / 03</span><span>OBSERVAR · COMPRENDER · VERIFICAR</span></div>
        </section>

        <section className="intro-strip" id="plataforma">
          <p className="eyebrow">UNA NUEVA MIRADA AL TERRITORIO</p>
          <p className="intro-statement">Los humedales de altura son ecosistemas esenciales. <strong>SATY transforma observaciones satelitales en información ambiental trazable</strong> para acompañar su estudio y seguimiento.</p>
        </section>

        <section className="feature-section">
          <div className="section-topline"><p className="eyebrow">01 — LA PLATAFORMA</p><span>HERRAMIENTAS PARA EXPLORAR</span></div>
          <div className="feature-grid">
            <article className="feature-card feature-card-dark"><span className="feature-number">01</span><div className="feature-icon">⌖</div><h3>Territorio<br/>en contexto</h3><p>Explorá áreas de interés mediante geometrías geográficas y visualización cartográfica.</p><span className="feature-foot">GEOJSON · MAPAS</span></article>
            <article className="feature-card"><span className="feature-number">02</span><div className="feature-icon">◌</div><h3>Observación<br/>satelital</h3><p>Procesá escenas Sentinel-2 y consultá indicadores espectrales como NDWI a lo largo del tiempo.</p><span className="feature-foot">SENTINEL-2 · NDWI</span></article>
            <article className="feature-card"><span className="feature-number">03</span><div className="feature-icon">⌁</div><h3>Evidencia<br/>trazable</h3><p>Vinculá resultados con registros verificables y conservá su contexto de origen.</p><span className="feature-foot">HASHES · AVALANCHE FUJI</span></article>
          </div>
        </section>

        <section className="method-section" id="metodo">
          <div className="method-heading"><p className="eyebrow">02 — CÓMO FUNCIONA</p><h2>Del territorio<br/>a la evidencia.</h2><p>Un flujo de trabajo que conecta información geográfica, observación de la Tierra y revisión humana.</p></div>
          <div className="method-steps">
            <article><span>01</span><div><h3>Definí el área</h3><p>Seleccioná un humedal o importá una geometría GeoJSON para delimitar el área de análisis.</p></div></article>
            <article><span>02</span><div><h3>Analizá imágenes</h3><p>Consultá escenas satelitales disponibles y calculá NDWI para explorar variaciones en el tiempo.</p></div></article>
            <article><span>03</span><div><h3>Revisá y verificá</h3><p>Examiná resultados, incidencias y procedencia antes de cualquier interpretación o publicación.</p></div></article>
          </div>
        </section>

        <section className="pilot-section" id="piloto">
          <div className="pilot-copy"><p className="eyebrow">03 — TERRITORIO PILOTO</p><h2>Una plataforma<br/>para muchos salares.</h2><p>Vega está pensada para ampliar el monitoreo a distintos humedales y salares de la Puna. Cada área requiere geometrías de origen conocido y validación territorial.</p><a href="#workspace" className="text-link">Probar con un área propia <span>↗</span></a></div>
          <div className="pilot-visual"><div className="pilot-contour contour-a"/><div className="pilot-contour contour-b"/><div className="pilot-contour contour-c"/><div className="pilot-label"><span className="live-dot"/> PUNA ARGENTINA</div><div className="pilot-coord">GEOGRAFÍA VIVA<br/><strong>ANDES · 3.500 m+</strong></div></div>
        </section>

        <section className="workspace-intro" id="workspace"><div><p className="eyebrow">ENTORNO INTERACTIVO</p><h2>Explorá Vega</h2><p>Importá un GeoJSON y comenzá un análisis. El procesamiento requiere que el servicio local o remoto esté disponible.</p></div><span className="workspace-status">ACCESO A LA PLATAFORMA <b>↓</b></span></section>
      </div>
    </>
  );
}

export default function App() {
  const [activeWetlands, setActiveWetlands] = useState<WetlandFeature[]>(sampleWetlands);
  const [selected, setSelected] = useState(sampleWetlands[0]?.properties.wetlandId ?? 1);
  const [series, setSeries] = useState<OnchainMeasurement[]>([]);
  const [usingUploadedGeoJson, setUsingUploadedGeoJson] = useState(false);
  const [mapVersion, setMapVersion] = useState(0);
  const wetland = activeWetlands.find((item) => item.properties.wetlandId === selected);

  useEffect(() => {
    let active = true;
    if (usingUploadedGeoJson) {
      setSeries([]);
      return () => { active = false; };
    }
    dataSource.getMeasurements(selected)
      .then((rows) => { if (active) setSeries(rows); })
      .catch((error) => { if (active) console.error(error); });
    return () => { active = false; };
  }, [selected, usingUploadedGeoJson]);

  function handlePreview(next: WetlandFeature[]) {
    setActiveWetlands(next);
    setSelected(next[0]?.properties.wetlandId ?? 1);
    setSeries([]);
    setUsingUploadedGeoJson(true);
    setMapVersion((version) => version + 1);
  }

  function resetSampleData() {
    setActiveWetlands(sampleWetlands);
    setSelected(sampleWetlands[0]?.properties.wetlandId ?? 1);
    setSeries([]);
    setUsingUploadedGeoJson(false);
    setMapVersion((version) => version + 1);
  }

  const last = series.at(-1);

  return (
    <>
      <LandingIntro />
      {usingUploadedGeoJson && <div className="dataset-notice"><span>Vista previa de geometrías importadas. Las mediciones se mostrarán cuando finalice el análisis del servicio.</span><button type="button" onClick={resetSampleData}>Volver a datos de ejemplo</button></div>}
      <GeoJsonAnalysis onPreview={handlePreview} onReset={resetSampleData} />
      <main className="workspace-grid">
        <section className="map-panel">
          <div className="section-heading"><div><p className="eyebrow">EXPLORADOR GEOGRÁFICO</p><h2>Áreas de monitoreo</h2></div><span>{activeWetlands.length} área(s)</span></div>
          <WetlandMap key={mapVersion} wetlands={activeWetlands} selected={selected} onSelect={setSelected} />
          <p className="map-caption">Los polígonos representan áreas de análisis. La geometría importada requiere revisión territorial antes de su uso institucional.</p>
        </section>
        <section className="panel data-panel">
          <div><p className="eyebrow">SERIE AMBIENTAL</p><h2>{wetland?.properties.name ?? "Seleccioná un área"}</h2>{wetland && <p className="wetland-meta">{wetland.properties.salar} · ID {wetland.properties.wetlandId}</p>}</div>
          {usingUploadedGeoJson ? <div className="empty-series"><strong>Área importada</strong><p>La vista previa no reutiliza mediciones mock ni registros on-chain de otras geometrías. Consultá los resultados del trabajo de análisis en el panel superior.</p></div> : <><NdwiChart series={series} threshold={wetland?.properties.thresholdNdwi ?? 0}/>{last && <VerifyButton measurement={last} />}{!last && <p className="empty-series">No hay mediciones disponibles para esta área en la fuente seleccionada.</p>}</>}
        </section>
      </main>
      <footer className="site-footer"><a className="footer-brand" href="#inicio">SATY</a><span>Monitoreo ambiental · Puna argentina</span><span>Evidencia ambiental trazable · Resultados sujetos a validación científica.</span><a href="#inicio">Volver arriba ↑</a></footer>
    </>
  );
}
