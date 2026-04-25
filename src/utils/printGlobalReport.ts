export const printGlobalReport = (logs: any[], operatorName: string) => {
  if (!logs || logs.length === 0) {
    alert('No hay registros para generar el informe.');
    return;
  }

  // Agrupar por cliente para verificar si hay varios
  const clientesUnicos = [...new Set(logs.map(l => l.clients?.name || 'Desconocido'))];
  const clienteNombre = clientesUnicos.length === 1 ? clientesUnicos[0] : 'VARIOS CLIENTES';

  const totalSacos = logs.reduce((acc, l) => acc + (l.total_sacks || 0), 0);
  const totalCuarzo = logs.reduce((acc, l) => acc + (l.total_cuarzo || 0), 0);
  const totalLlampo = logs.reduce((acc, l) => acc + (l.total_llampo || 0), 0);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rowsHtml = logs.map((log, index) => {
    const date = new Date(log.created_at);
    const fecha = date.toLocaleDateString('es-PE');
    const hora = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    const molinos = (log.mills_used || []).map((m: any) => m.name || \`M-\${m.id.substring(0,4)}\`).join(', ');

    return \`
      <tr>
        <td>\${index + 1}</td>
        <td>\${fecha} \${hora}</td>
        <td>\${log.mineral_type || '-'}</td>
        <td>\${molinos || '-'}</td>
        <td class="text-right">\${log.total_cuarzo || 0}</td>
        <td class="text-right">\${log.total_llampo || 0}</td>
        <td class="text-right font-bold">\${log.total_sacks || 0}</td>
      </tr>
    \`;
  }).join('');

  printWindow.document.write(\`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Informe Global de Molienda</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            padding: 20px;
            background: white;
            color: #1e293b;
          }
          .comprobante {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            overflow: hidden;
          }
          .header {
            background: #f8fafc;
            color: #1e293b;
            padding: 20px;
            text-align: center;
            border-bottom: 4px solid #4f46e5;
          }
          .header h1 { 
            font-size: 18px; 
            margin-bottom: 4px; 
            letter-spacing: 1px;
            color: #4f46e5;
          }
          .header h2 { 
            font-size: 24px; 
            font-weight: 800; 
            color: #0f172a;
            text-transform: uppercase;
          }
          .content { padding: 30px; }
          
          .resumen-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 30px;
          }
          .resumen-item {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
          }
          .resumen-label {
            font-size: 11px;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 5px;
          }
          .resumen-valor {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 12px;
          }
          th {
            background: #f8fafc;
            padding: 10px;
            text-align: left;
            color: #64748b;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }

          .firmas {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
            margin-top: 40px;
            padding-top: 30px;
          }
          .firma { text-align: center; }
          .firma-title {
            font-weight: 700;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 40px;
          }
          .firma-line {
            border-top: 2px solid #1e293b;
            margin: 0 20px 8px;
          }
          .firma-name {
            font-size: 13px;
            color: #64748b;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            padding: 15px;
            background: #f8fafc;
            color: #64748b;
            font-size: 10px;
            border-top: 1px solid #e2e8f0;
          }
          @media print {
            @page { margin: 1cm; size: A4 portrait; }
            body { padding: 0; background: white; }
            .comprobante { border: none; border-radius: 0; }
            .firmas { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="comprobante">
          <div class="header">
            <h1>PLANTA DE PROCESAMIENTO DE MINERALES</h1>
            <h2>INFORME GLOBAL DE MOLIENDA</h2>
            <div style="margin-top:10px; font-weight:600; color:#64748b;">
              Cliente: <strong style="color:#0f172a; font-size:16px;">\${clienteNombre}</strong>
            </div>
          </div>

          <div class="content">
            <div class="resumen-grid">
              <div class="resumen-item">
                <div class="resumen-label">Total Registros</div>
                <div class="resumen-valor" style="color:#3b82f6;">\${logs.length}</div>
              </div>
              <div class="resumen-item">
                <div class="resumen-label">Total Cuarzo</div>
                <div class="resumen-valor">\${totalCuarzo}</div>
              </div>
              <div class="resumen-item">
                <div class="resumen-label">Total Llampo</div>
                <div class="resumen-valor">\${totalLlampo}</div>
              </div>
              <div class="resumen-item" style="background:#e0e7ff; border-color:#c7d2fe;">
                <div class="resumen-label" style="color:#4f46e5;">TOTAL SACOS</div>
                <div class="resumen-valor" style="color:#4f46e5; font-size:24px;">\${totalSacos}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha y Hora</th>
                  <th>Mineral</th>
                  <th>Molinos</th>
                  <th class="text-right">Cuarzo</th>
                  <th class="text-right">Llampo</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                \${rowsHtml}
              </tbody>
            </table>

            <div class="firmas">
              <div class="firma">
                <div class="firma-title">Responsable Planta</div>
                <div class="firma-line"></div>
                <div class="firma-name">\${operatorName}</div>
              </div>
              <div class="firma">
                <div class="firma-title">Conformidad Cliente</div>
                <div class="firma-line"></div>
                <div class="firma-name">\${clienteNombre === 'VARIOS CLIENTES' ? '' : clienteNombre}</div>
              </div>
            </div>
          </div>

          <div class="footer">
            <p>Fecha de emisión del informe: \${new Date().toLocaleDateString()} - \${new Date().toLocaleTimeString()}</p>
            <p>Este documento consolida las operaciones realizadas en el periodo o filtros seleccionados.</p>
          </div>
        </div>
      </body>
    </html>
  \`);

  printWindow.document.close();
  // Small delay to ensure styles are loaded
  setTimeout(() => {
    printWindow.print();
  }, 250);
};
