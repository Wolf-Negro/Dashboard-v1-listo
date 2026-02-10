import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Evita que guarde caché vieja

// Tus IDs del archivo .env.local
const ACCOUNTS = [
  process.env.FB_ACCOUNT_ID_1,
  process.env.FB_ACCOUNT_ID_2,
  process.env.FB_ACCOUNT_ID_3,
  process.env.FB_ACCOUNT_ID_4,
].filter(Boolean); // Filtra si alguno está vacío

const TOKEN = process.env.FACEBOOK_ACCESS_TOKEN;

export async function GET() {
  if (!TOKEN || ACCOUNTS.length === 0) {
    return NextResponse.json({ error: 'Faltan credenciales en .env.local' }, { status: 500 });
  }

  try {
    const reportes = await Promise.all(
      ACCOUNTS.map(async (actId) => {
        // Pedimos a Facebook: Campañas, Gasto, Acciones (Mensajes), SOLO DE HOY
        const url = `https://graph.facebook.com/v19.0/${actId}/insights?fields=campaign_name,spend,actions&date_preset=today&level=campaign&access_token=${TOKEN}`;
        
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
          console.error(`Error en cuenta ${actId}:`, data.error.message);
          return null;
        }

        // Procesamos las campañas de esta cuenta
        const campanas = (data.data || []).map((camp: any) => {
          // Buscamos la acción de "Mensaje Iniciado"
          const msgAction = camp.actions?.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
          const mensajes = msgAction ? parseInt(msgAction.value) : 0;
          
          return {
            id: camp.id,
            producto: camp.campaign_name, // Nombre de la campaña en FB
            gasto: parseFloat(camp.spend || '0'),
            mensajes: mensajes
          };
        }).filter((c: any) => c.gasto > 0); // Solo campañas activas hoy

        return {
          id: actId,
          nombre: `Cuenta ${actId?.slice(-4)}`, // Usamos los últimos 4 dígitos como nombre
          gastoHoy: campanas.reduce((sum: number, c: any) => sum + c.gasto, 0),
          mensajesHoy: campanas.reduce((sum: number, c: any) => sum + c.mensajes, 0),
          activo: campanas.length > 0,
          campanas: campanas
        };
      })
    );

    // Limpiamos los nulos y retornamos la data limpia al Frontend
    const cuentasValidas = reportes.filter(r => r !== null);
    
    return NextResponse.json({ 
      cuentas: cuentasValidas, 
      lastUpdated: new Date().toISOString() 
    });

  } catch (error) {
    return NextResponse.json({ error: 'Error conectando a Facebook' }, { status: 500 });
  }
}