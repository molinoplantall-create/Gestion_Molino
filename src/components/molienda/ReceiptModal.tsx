import React, { useState } from 'react';
import { BaseModal } from '../ui/BaseModal';
import { Printer, FileText } from 'lucide-react';

interface MolinoProceso {
    id: string;
    nombre: string;
    activo: boolean;
    cuarzo: number;
    llampo: number;
    total: number;
    tiempoEstimado: number;
    horaFin: string | null;
}

interface TiemposProceso {
    oxido: {
        hora40: boolean;
        hora00: boolean;
    };
    sulfuro: {
        hora00: boolean;
        hora30: boolean;
    };
}

interface MoliendaData {
    clienteNombre: string;
    tipoCliente: string;
    mineral: 'OXIDO' | 'SULFURO';
    tiempos: TiemposProceso;
    fechaInicio: string | null;
    horaInicio: string | null;
    horaFin: string | null;
    stockTotal: number;
    totalSacos: number;
    totalCuarzo: number;
    totalLlampo: number;
    stockRestanteTotal: number;
    tiempoPorMolino: number;
    molinos: MolinoProceso[];
    observaciones: string;
    procesoId: string | null;
    estado: string;
}

interface ReceiptModalProps {
    isOpen: boolean;
    onClose: () => void;
    moliendaData: MoliendaData;
    userEmail?: string;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
    isOpen,
    onClose,
    moliendaData,
    userEmail
}) => {
    const [firmaOperador, setFirmaOperador] = useState('');
    const [firmaCliente, setFirmaCliente] = useState('');

    const formatTiempo = (totalMinutos: number): string => {
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;
        if (horas > 0) {
            return `${horas}h ${minutos}min`;
        }
        return `${minutos}min`;
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const molinosActivos = moliendaData.molinos.filter(m => m.activo);
        const tiemposText = moliendaData.mineral === 'OXIDO'
            ? `Óxido: ${moliendaData.tiempos.oxido.hora40 ? '☑ 1:40' : '☐ 1:40'} | ${moliendaData.tiempos.oxido.hora00 ? '☑ 1:00' : '☐ 1:00'}`
            : `Sulfuro: ${moliendaData.tiempos.sulfuro.hora00 ? '☑ 2:00' : '☐ 2:00'} | ${moliendaData.tiempos.sulfuro.hora30 ? '☑ 2:30' : '☐ 2:30'}`;

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comprobante de Molienda ${moliendaData.procesoId}</title>
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
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 { font-size: 24px; margin-bottom: 8px; }
            .header h2 { font-size: 18px; font-weight: 600; opacity: 0.95; }
            .header .numero { 
              margin-top: 15px; 
              padding: 8px 16px; 
              background: rgba(255,255,255,0.2); 
              border-radius: 6px; 
              display: inline-block;
              font-size: 14px;
            }
            .content { padding: 30px; }
            .section {
              margin-bottom: 24px;
              padding-bottom: 24px;
              border-bottom: 1px solid #e2e8f0;
            }
            .section:last-child { border-bottom: none; }
            .section-title {
              font-size: 14px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 12px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
            }
            .info-item {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              background: #f8fafc;
              border-radius: 6px;
            }
            .info-label { color: #64748b; font-size: 13px; }
            .info-value { font-weight: 600; color: #1e293b; font-size: 13px; }
            .molino-card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 12px;
            }
            .molino-header {
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .molino-details {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 8px;
              font-size: 12px;
            }
            .firmas {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 40px;
              margin-top: 40px;
              padding-top: 30px;
              border-top: 2px solid #e2e8f0;
            }
            .firma {
              text-align: center;
            }
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
            }
            .footer {
              text-align: center;
              padding: 20px;
              background: #f8fafc;
              color: #64748b;
              font-size: 11px;
              line-height: 1.6;
            }
            @media print {
              body { padding: 0; }
              .comprobante { border: none; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="comprobante">
            <div class="header">
              <h1>PLANTA DE PROCESAMIENTO DE MINERALES</h1>
              <h2>Comprobante de Molienda</h2>
              <div class="numero">N° ${moliendaData.procesoId || 'PENDIENTE'}</div>
            </div>

            <div class="content">
              <!-- Cliente -->
              <div class="section">
                <div class="section-title">Información del Cliente</div>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Cliente:</span>
                    <span class="info-value">${moliendaData.clienteNombre}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Tipo:</span>
                    <span class="info-value">${moliendaData.tipoCliente}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Mineral:</span>
                    <span class="info-value">${moliendaData.mineral}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Fecha:</span>
                    <span class="info-value">${moliendaData.fechaInicio || new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <!-- Tiempo -->
              <div class="section">
                <div class="section-title">Tiempo de Proceso</div>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Configuración:</span>
                    <span class="info-value">${tiemposText}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Tiempo/Molino:</span>
                    <span class="info-value">${formatTiempo(moliendaData.tiempoPorMolino)}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Hora inicio:</span>
                    <span class="info-value">${moliendaData.horaInicio || '--:--'}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Hora fin:</span>
                    <span class="info-value">${moliendaData.horaFin || '--:--'}</span>
                  </div>
                </div>
              </div>

              <!-- Molinos -->
              <div class="section">
                <div class="section-title">Detalle por Molino</div>
                ${molinosActivos.map((molino, index) => `
                  <div class="molino-card">
                    <div class="molino-header">${index + 1}. ${molino.nombre}</div>
                    <div class="molino-details">
                      <div><span class="info-label">Total:</span> ${molino.total} sacos</div>
                      <div><span class="info-label">Tiempo:</span> ${formatTiempo(molino.tiempoEstimado)}</div>
                      <div><span class="info-label">Cuarzo:</span> ${molino.cuarzo} sacos</div>
                      <div><span class="info-label">Hora fin:</span> ${molino.horaFin || '--:--'}</div>
                      <div><span class="info-label">Llampo:</span> ${molino.llampo} sacos</div>
                    </div>
                  </div>
                `).join('')}
              </div>

              <!-- Resumen -->
              <div class="section">
                <div class="section-title">Resumen General</div>
                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Total sacos:</span>
                    <span class="info-value">${moliendaData.totalSacos}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Molinos activos:</span>
                    <span class="info-value">${molinosActivos.length}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Cuarzo:</span>
                    <span class="info-value">${moliendaData.totalCuarzo} sacos</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Stock restante:</span>
                    <span class="info-value">${moliendaData.stockRestanteTotal} sacos</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Llampo:</span>
                    <span class="info-value">${moliendaData.totalLlampo} sacos</span>
                  </div>
                </div>
              </div>

              <!-- Observaciones -->
              ${moliendaData.observaciones ? `
                <div class="section">
                  <div class="section-title">Observaciones</div>
                  <p style="padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 13px; line-height: 1.6;">
                    ${moliendaData.observaciones}
                  </p>
                </div>
              ` : ''}

              <!-- Firmas -->
              <div class="firmas">
                <div class="firma">
                  <div class="firma-title">Operador</div>
                  <div class="firma-line"></div>
                  <div class="firma-name">${firmaOperador || userEmail || ''}</div>
                </div>
                <div class="firma">
                  <div class="firma-title">Cliente</div>
                  <div class="firma-line"></div>
                  <div class="firma-name">${firmaCliente || moliendaData.clienteNombre}</div>
                </div>
              </div>
            </div>

            <div class="footer">
              <p>Fecha de emisión: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}</p>
              <p>Este documento certifica el inicio del proceso de molienda.</p>
              <p>Todos los molinos activos terminan a la misma hora.</p>
            </div>
          </div>
        </body>
      </html>
    `);

        printWindow.document.close();
        printWindow.print();
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Comprobante de Molienda"
            size="lg"
        >
            <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start">
                        <FileText className="text-blue-600 mr-3 mt-0.5" size={20} />
                        <div>
                            <h4 className="text-sm font-bold text-blue-900 mb-1">Generar Comprobante</h4>
                            <p className="text-sm text-blue-700">
                                Complete las firmas opcionales y presione "Imprimir" para generar el comprobante.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Firma Operador (Opcional)
                        </label>
                        <input
                            type="text"
                            value={firmaOperador}
                            onChange={(e) => setFirmaOperador(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={userEmail || "Nombre del operador"}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Firma Cliente (Opcional)
                        </label>
                        <input
                            type="text"
                            value={firmaCliente}
                            onChange={(e) => setFirmaCliente(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={moliendaData.clienteNombre}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                    >
                        <Printer size={18} className="mr-2" />
                        Imprimir
                    </button>
                </div>
            </div>
        </BaseModal>
    );
};
