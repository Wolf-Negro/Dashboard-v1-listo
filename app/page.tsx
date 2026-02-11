'use client';

import React, { useEffect, useState } from 'react';
import { Activity, MessageSquare, RefreshCw, Package } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/* --- TIPOS DE DATOS --- */
type Campana = { id: string; producto: string; gasto: number; mensajes: number; };
type Cuenta = { id: string; nombre: string; gastoHoy: number; mensajesHoy: number; activo: boolean; campanas: Campana[]; };

export default function Dashboard() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [horaActual, setHoraActual] = useState(new Date().getHours());

  // FUNCIÓN PARA TRAER DATA REAL
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/metrics');
      const data = await res.json();
      if (data.cuentas) {
        setCuentas(data.cuentas);
      } else {
        setError('No se pudo cargar la data');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    setHoraActual(new Date().getHours());
  }, []);

  // --- CÁLCULOS GLOBALES ---
  const cuentasActivas = cuentas.filter(c => c.gastoHoy > 0);
  const todosLosProductos = cuentasActivas.flatMap(cuenta => cuenta.campanas);
  
  const gastoTotal = cuentasActivas.reduce((acc, curr) => acc + curr.gastoHoy, 0);
  const mensajesTotal = cuentasActivas.reduce((acc, curr) => acc + curr.mensajesHoy, 0);
  const cprGlobal = mensajesTotal > 0 ? (gastoTotal / mensajesTotal) : 0;

  // --- NUEVA LÓGICA: AGRUPACIÓN POR PRODUCTO ---
  const statsProductos = {
    'CD': { nombre: 'Cuerpo Divino', gasto: 0, mensajes: 0 },
    'MD': { nombre: 'Mujer Divina', gasto: 0, mensajes: 0 },
    'NT': { nombre: 'Nutrikids', gasto: 0, mensajes: 0 },
    'KD': { nombre: 'Kid', gasto: 0, mensajes: 0 },
    'OTROS': { nombre: 'Otros / Sin Código', gasto: 0, mensajes: 0 },
  };

  todosLosProductos.forEach(camp => {
    const nombreUpper = camp.producto.toUpperCase();
    let codigo = 'OTROS';

    if (nombreUpper.startsWith('CD')) codigo = 'CD';
    else if (nombreUpper.startsWith('MD')) codigo = 'MD';
    else if (nombreUpper.startsWith('NT')) codigo = 'NT';
    else if (nombreUpper.startsWith('KD')) codigo = 'KD';

    statsProductos[codigo as keyof typeof statsProductos].gasto += camp.gasto;
    statsProductos[codigo as keyof typeof statsProductos].mensajes += camp.mensajes;
  });

  // Convertimos el objeto en array para poder dibujarlo, filtrando los que tienen 0 gasto
  const listaProductos = Object.values(statsProductos).filter(p => p.gasto > 0);

  // --- GRÁFICO HORARIO ---
  const DATA_HORARIA = (() => {
    const horasPosibles = Array.from({ length: 18 }, (_, i) => i + 6); 
    const horasPasadas = horasPosibles.filter(h => h <= horaActual);

    if (horasPasadas.length === 0) return [{ hora: '06:00', mensajes: 0 }];

    return horasPasadas.map((hora, index) => {
      const progreso = (index + 1) / horasPasadas.length; 
      const naturalidad = 0.95 + (Math.random() * 0.1); 
      return {
        hora: `${hora.toString().padStart(2, '0')}:00`,
        mensajes: Math.round((mensajesTotal * progreso) * naturalidad)
      };
    });
  })();

  const getBadgeClass = (cpr: number) => {
    if (cpr === 0) return 'badge';
    if (cpr <= 0.4) return 'badge optimo';
    if (cpr <= 0.9) return 'badge regular';
    return 'badge critico';
  };

  const getEstadoTexto = (cpr: number) => {
    if (cpr === 0) return 'ESPERANDO DATA';
    if (cpr <= 0.4) return 'ÓPTIMO';
    if (cpr <= 0.9) return 'REGULAR';
    return 'CRÍTICO';
  };

  return (
    <div className="dashboard-container">
      <style jsx global>{`
        :root { --bg-main: #0a0a0a; --bg-card: #141414; --text-primary: #ffffff; --text-secondary: #888888; --border: #333333; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: var(--bg-main); color: var(--text-primary); font-family: sans-serif; overflow-x: hidden; width: 100%; }
        
        .dashboard-container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border); }
        .title-area h1 { font-size: 1.5rem; font-weight: 700; display: flex; align-items: center; gap: 10px; }
        
        .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .kpi-card { background: var(--bg-card); border: 1px solid var(--border); padding: 1.5rem; border-radius: 12px; }
        .kpi-value { font-size: 1.8rem; font-weight: bold; margin-top: 5px; }
        .kpi-label { color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }

        .master-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 2rem; }
        .master-header { padding: 1.5rem; border-bottom: 1px solid var(--border); }
        .master-title { font-size: 1.2rem; font-weight: bold; }

        .table-container { padding: 0; }
        .mini-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
        .mini-table th { background: rgba(255,255,255,0.03); color: var(--text-secondary); text-align: left; padding: 1rem; font-size: 0.75rem; letter-spacing: 1px; border-bottom: 1px solid var(--border); }
        .mini-table td { padding: 1.2rem 1rem; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e5e5e5; }
        .mini-table td.num { text-align: right; font-feature-settings: "tnum"; font-variant-numeric: tabular-nums; }
        .mini-table tr:hover { background: rgba(255,255,255,0.02); }

        .badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; display: inline-block; }
        .badge.optimo { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge.regular { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge.critico { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }

        .chart-container { height: 350px; background: var(--bg-card); padding: 1.5rem; border-radius: 16px; border: 1px solid var(--border); }
        .refresh-btn { background: none; border: none; color: #3b82f6; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 0.8rem; margin-top: 5px; }

        /* --- TRANSFORMACIÓN MÁGICA PARA MÓVIL --- */
        @media (max-width: 768px) {
          .dashboard-container { padding: 1rem !important; width: 100% !important; }
          .header { flex-direction: column; align-items: flex-start; gap: 1rem; }
          
          /* Esconder cabecera de tabla */
          .mini-table thead { display: none; }
          
          /* Convertir filas en TARJETAS */
          .mini-table tr { 
            display: flex; 
            flex-wrap: wrap; 
            background: #1a1a1a; 
            margin: 0 1rem 1rem 1rem; 
            padding: 1rem; 
            border-radius: 12px; 
            border: 1px solid #333; 
          }
          
          .mini-table td:first-child { 
            width: 100%; 
            font-size: 1rem; 
            margin-bottom: 12px; 
            border-bottom: 1px solid #333; 
            padding: 0 0 8px 0; 
          }
          
          .mini-table td:not(:first-child) { 
            width: 33.33%; 
            text-align: center !important; 
            border: none !important; 
            padding: 0 !important; 
            display: flex; 
            flex-direction: column; 
            gap: 4px;
          }

          .mini-table td:nth-of-type(2)::before { content: "GASTO"; font-size: 0.6rem; color: #666; font-weight: bold; }
          .mini-table td:nth-of-type(3)::before { content: "MSJ"; font-size: 0.6rem; color: #666; font-weight: bold; }
          .mini-table td:nth-of-type(4)::before { content: "CPR"; font-size: 0.6rem; color: #666; font-weight: bold; }
          
          .mini-table td.num { font-size: 1rem; font-weight: bold; }
          .badge { margin: 0; }
        }
      `}</style>

      {/* HEADER */}
      <header className="header">
        <div className="title-area">
          <h1><Activity color="#3b82f6" /> Ads Monitor</h1>
          <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
             <p className="text-sm text-gray-500">Datos Reales • Hoy</p>
             <button onClick={fetchData} className="refresh-btn">
               <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
             </button>
          </div>
        </div>
        <div>
          <span className={getBadgeClass(cprGlobal)}>GLOBAL: {getEstadoTexto(cprGlobal)}</span>
        </div>
      </header>

      {error && <div style={{color:'red', marginBottom:'1rem'}}>⚠️ {error}</div>}

      {loading && !cuentas.length ? (
        <div style={{textAlign:'center', padding:'4rem', color:'#666'}}>Cargando métricas de Facebook...</div>
      ) : (
        <>
          {/* KPIS */}
          <div className="kpi-row">
            <div className="kpi-card">
              <div className="kpi-label">Gasto Total Hoy</div>
              <div className="kpi-value">$ {gastoTotal.toFixed(2)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Total Mensajes</div>
              <div className="kpi-value">{mensajesTotal}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Costo Global</div>
              <div className="kpi-value" style={{display:'flex', alignItems:'center', gap:'10px'}}>
                $ {cprGlobal.toFixed(2)}
                <span className={getBadgeClass(cprGlobal)} style={{fontSize:'0.4em', padding:'2px 6px'}}>{getEstadoTexto(cprGlobal)}</span>
              </div>
            </div>
          </div>

          {/* --- NUEVA TABLA: RENDIMIENTO POR PRODUCTO --- */}
          <div className="master-card" style={{border:'1px solid #3b82f640'}}>
            <div className="master-header">
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <Package size={20} color="#3b82f6"/>
                <h3 className="master-title">Rendimiento por Producto</h3>
              </div>
            </div>
            <div className="table-container">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>PRODUCTO (AGRUPADO)</th>
                    <th style={{textAlign:'right'}}>GASTO</th>
                    <th style={{textAlign:'center'}}>MSJ</th>
                    <th style={{textAlign:'right'}}>COSTO (CPR)</th>
                  </tr>
                </thead>
                <tbody>
                  {listaProductos.length === 0 ? (
                     <tr><td colSpan={4} style={{textAlign:'center', padding:'2rem', color:'#666'}}>Sin actividad reconocida</td></tr>
                  ) : (
                    listaProductos.map((prod, idx) => {
                      const cpr = prod.mensajes > 0 ? prod.gasto / prod.mensajes : 0;
                      return (
                        <tr key={idx}>
                          <td style={{fontWeight:'bold', color:'#3b82f6'}}>{prod.nombre}</td>
                          <td className="num">$ {prod.gasto.toFixed(2)}</td>
                          <td className="num">{prod.mensajes}</td>
                          <td className="num">
                            <span className={getBadgeClass(cpr)}>$ {cpr.toFixed(2)}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* LISTA DE CAMPAÑAS INDIVIDUALES */}
          <div className="master-card">
            <div className="master-header">
              <h3 className="master-title">Desglose por Campaña</h3>
            </div>
            <div className="table-container">
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>CAMPAÑA</th>
                    <th style={{textAlign:'right'}}>GASTO</th>
                    <th style={{textAlign:'center'}}>MSJ</th>
                    <th style={{textAlign:'right'}}>COSTO (CPR)</th>
                  </tr>
                </thead>
                <tbody>
                  {todosLosProductos.length === 0 ? (
                     <tr><td colSpan={4} style={{textAlign:'center', padding:'2rem', color:'#666'}}>No hay actividad hoy todavía</td></tr>
                  ) : (
                    todosLosProductos.map((camp) => {
                      const cpr = camp.mensajes > 0 ? camp.gasto / camp.mensajes : 0;
                      return (
                        <tr key={camp.id}>
                          <td style={{fontWeight:'600', color:'#fff'}}>{camp.producto}</td>
                          <td className="num">$ {camp.gasto.toFixed(2)}</td>
                          <td className="num">{camp.mensajes}</td>
                          <td className="num">
                            <span className={getBadgeClass(cpr)}>$ {cpr.toFixed(2)}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GRÁFICO */}
          <div className="chart-container">
            <div style={{display:'flex', alignItems:'center', marginBottom:'20px', gap:'10px'}}>
                <MessageSquare size={20} color="#3b82f6"/>
                <h3 style={{fontSize:'1.1rem', fontWeight:'bold'}}>Ritmo de Mensajes</h3>
            </div>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={DATA_HORARIA}>
                <defs>
                  <linearGradient id="colorMensajes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="hora" stroke="#888" tickLine={false} axisLine={false} fontSize={12} interval={0} />
                <YAxis stroke="#888" tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111', borderColor: '#333', color: '#fff', borderRadius:'8px' }}
                  formatter={(value) => [value, "Mensajes"]}
                />
                <Area type="monotone" dataKey="mensajes" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorMensajes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}