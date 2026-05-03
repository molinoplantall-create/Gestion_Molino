import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Package,
  Download,
  Truck,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ArrowUpDown,
  ArrowDownWideNarrow,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  TIPO_CLIENTE,
  MINERAL_TYPES_STOCK,
  SUBMINERAL_TYPES_STOCK
} from '../constants';
import { useAuthStore } from '../store/authStore';
import { useSupabaseStore } from '../store/supabaseStore';
import { useToast } from '../hooks/useToast';
import { FormModal } from '../components/ui/FormModal';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatNumber } from '../utils/formatters';
import { ClientSelector } from '@/components/molienda/ClientSelector';

export interface NuevoIngresoForm {
  fechaRecepcion: string;
  tipoCliente: string;
  clienteId: string;
  zona: string;
  mineral: string;
  mineralType: 'OXIDO' | 'SULFURO';
  cuarzo: number;
  llampo: number;
  total: number;
  clienteNombre: string;
  transportista: string;
  placaCamion: string;
  observaciones: string;
}

const Stock: React.FC = () => {
  const { user } = useAuthStore();

  // Helper para formatear fechas sin desfase de zona horaria
  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return '---';
    try {
      // Extraemos solo YYYY-MM-DD
      const datePart = dateStr.split('T')[0];
      const [year, month, day] = datePart.split('-');
      // Devolvemos formato DD/MM/YYYY
      return `${day}/${month}/${year}`;
    } catch (e) {
      return '---';
    }
  };
  const { clients, zones, loading, clientsLoading, fetchClients, fetchZones, allClients, fetchAllClients, addClientStock, updateBatchMineralType, deleteStockBatch, fetchClientBatches } = useSupabaseStore();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [sortOrder, setSortOrder] = useState<'total' | 'name'>('total');

  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [clientBatches, setClientBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [monthFilter, setMonthFilter] = useState('all'); // 'all', 'current', 'prev'

  // Agrupación y filtrado de lotes
  const groupedBatches = React.useMemo(() => {
    let filtered = clientBatches;
    const now = new Date();
    
    // 1. Filtrar por rango
    if (monthFilter === 'current') {
      filtered = clientBatches.filter(b => {
        const d = new Date(b.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    } else if (monthFilter === 'prev') {
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      filtered = clientBatches.filter(b => {
        const d = new Date(b.created_at);
        return d.getMonth() === prevMonth.getMonth() && d.getFullYear() === prevMonth.getFullYear();
      });
    }

    // 2. Agrupar por fecha/hora para unificar Cuarzo y Llampo del mismo viaje
    const groups: any[] = [];
    filtered.forEach(batch => {
      // Tomamos hasta los minutos para agrupar (HH:mm)
      const dateStr = batch.created_at.substring(0, 16); 
      let grp = groups.find(g => g.dateKey === dateStr && g.zone === batch.zone);
      
      if (!grp) {
        grp = { 
          id: batch.id, 
          dateKey: dateStr, 
          created_at: batch.created_at, 
          zone: batch.zone, 
          mineral_type: batch.mineral_type,
          inputs: [] 
        };
        groups.push(grp);
      }
      grp.inputs.push(batch);
    });
    
    return groups;
  }, [clientBatches, monthFilter]);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Batch Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [batchToEdit, setBatchToEdit] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    initial_quantity: 0,
    remaining_quantity: 0,
    zone: '',
    mineral_type: 'OXIDO' as 'OXIDO' | 'SULFURO',
    created_at: ''
  });
  const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);

  // Initial fetch
  useEffect(() => {
    fetchZones();
    fetchAllClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch clients when search changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchClients({ search, pageSize: 100, status: 'all' });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [search, fetchClients]);

  // Estado para nuevo ingreso
  const [nuevoIngreso, setNuevoIngreso] = useState<NuevoIngresoForm>({
    fechaRecepcion: new Date().toISOString().slice(0, 10),
    tipoCliente: '',
    clienteId: '',
    zona: '',
    mineral: '',
    mineralType: 'OXIDO' as 'OXIDO' | 'SULFURO',
    cuarzo: 0,
    llampo: 0,
    total: 0,
    clienteNombre: '',
    transportista: '',
    placaCamion: '',
    observaciones: ''
  });

  // Calcular total automáticamente
  useEffect(() => {
    const total = (nuevoIngreso.cuarzo || 0) + (nuevoIngreso.llampo || 0);
    setNuevoIngreso(prev => ({ ...prev, total }));
  }, [nuevoIngreso.cuarzo, nuevoIngreso.llampo]);

  // Filtrar y ordenar clientes para mostrar en la lista
  const sortedClients = [...clients]
    .filter(c => {
      // El search ya viene filtrado desde el servidor en fetchClients
      const matchesTipo = filterTipo === 'all' || c.client_type === filterTipo;
      return matchesTipo;
    })
    .sort((a, b) => {
      if (sortOrder === 'total') {
        const totalA = (a.stock_cuarzo || 0) + (a.stock_llampo || 0);
        const totalB = (b.stock_cuarzo || 0) + (b.stock_llampo || 0);
        return totalB - totalA;
      } else {
        return a.name.localeCompare(b.name);
      }
    });

  // Totales globales basados en la DB
  const totalStock = clients.reduce((sum, c) => sum + (c.stock_cuarzo || 0) + (c.stock_llampo || 0), 0);
  const totalCuarzo = clients.reduce((sum, c) => sum + (c.stock_cuarzo || 0), 0);
  const totalLlampo = clients.reduce((sum, c) => sum + (c.stock_llampo || 0), 0);

  // Abrir modal para nuevo ingreso
  const abrirModalNuevo = () => {
    setNuevoIngreso({
      fechaRecepcion: new Date().toISOString().slice(0, 10),
      tipoCliente: '',
      clienteId: '',
      zona: '',
      mineral: '',
      mineralType: 'OXIDO',
      cuarzo: 0,
      llampo: 0,
      total: 0,
      clienteNombre: '',
      transportista: '',
      placaCamion: '',
      observaciones: ''
    });
    setShowModal(true);
  };

  // Guardar ingreso
  const guardarIngreso = async () => {
    console.log('🚀 Stock: Iniciando guardarIngreso', nuevoIngreso);
    if (!nuevoIngreso.clienteId) {
      toast.error('Error', 'Debe seleccionar un cliente');
      return;
    }
    if (nuevoIngreso.total <= 0) {
      toast.error('Error', 'Debe ingresar al menos una cantidad de Cuarzo o Llampo');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      console.log('📡 Stock: Llamando a addClientStock...');
      const success = await addClientStock(
        nuevoIngreso.clienteId,
        nuevoIngreso.cuarzo,
        nuevoIngreso.llampo,
        nuevoIngreso.zona,
        nuevoIngreso.mineralType,
        nuevoIngreso.fechaRecepcion
      );

      console.log('📊 Stock: Resultado de addClientStock:', success);
      if (success) {
        setShowModal(false);
        toast.success('Ingreso Exitoso', `Se ha registrado el ingreso de ${nuevoIngreso.total} sacos para ${nuevoIngreso.clienteNombre}`);
      } else {
        // Obtenemos el error específico del store si existe
        const storeError = useSupabaseStore.getState().error;
        toast.error('Error de Registro', storeError || 'No se pudo registrar el ingreso de mineral. Intente de nuevo.');
      }
    } catch (err: any) {
      console.error('❌ Stock: Error en guardarIngreso catch:', err);
      toast.error('Error Crítico', err.message || 'Ocurrió un error inesperado al procesar el ingreso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const headers = ['Cliente', 'Tipo', 'Zona', 'Stock Cuarzo', 'Stock Llampo', 'Total'];
    const csvData = [
      headers.join(','),
      ...clients.map(c => [
        `"${c.name}"`,
        c.client_type || 'N/A',
        c.zone || 'N/A',
        c.stock_cuarzo || 0,
        c.stock_llampo || 0,
        (c.stock_cuarzo || 0) + (c.stock_llampo || 0)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // View batches for a specific client
  const toggleBatches = async (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
      return;
    }

    setExpandedClient(clientId);
    setBatchesLoading(true);
    // Resetear el filtro al cambiar de cliente
    setMonthFilter('all');
    const batches = await fetchClientBatches(clientId);
    setClientBatches(batches);
    setBatchesLoading(false);
  };

  const handleUpdateMineralType = async (batchId: string, currentType: string) => {
    const newType = currentType === 'OXIDO' ? 'SULFURO' : 'OXIDO';
    const success = await updateBatchMineralType(batchId, newType);
    if (success) {
      toast.success('Tipo Actualizado', `El lote ahora es ${newType}`);
      // Refresh current client batches
      if (expandedClient) {
        const batches = await fetchClientBatches(expandedClient);
        setClientBatches(batches);
      }
    } else {
      toast.error('Error', 'No se pudo actualizar el tipo de mineral');
    }
  };

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return;

    setIsDeleting(true);
    try {
      const success = await deleteStockBatch(batchToDelete.id, batchToDelete.client_id);
      if (success) {
        toast.success('Ingreso Eliminado', 'Se ha revertido el stock del cliente correctamente.');
        // Refresh current client batches
        if (expandedClient) {
          const batches = await fetchClientBatches(expandedClient);
          setClientBatches(batches);
        }
        setShowDeleteModal(false);
      } else {
        toast.error('Error', 'No se pudo eliminar el registro.');
      }
    } catch (error) {
      console.error('Error deleting batch:', error);
      toast.error('Error', 'Ocurrió un error al intentar eliminar el lote.');
    } finally {
      setIsDeleting(false);
      setBatchToDelete(null);
    }
  };

  const handleDeleteClick = (batch: any) => {
    setBatchToDelete(batch);
    setShowDeleteModal(true);
  };

  const handleEditClick = (batch: any) => {
    setBatchToEdit(batch);
    setEditFormData({
      initial_quantity: batch.initial_quantity,
      remaining_quantity: batch.remaining_quantity,
      zone: batch.zone || '',
      mineral_type: batch.mineral_type || 'OXIDO',
      created_at: batch.created_at ? new Date(batch.created_at).toISOString().split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const handleUpdateBatch = async () => {
    if (!batchToEdit) return;

    setIsUpdatingBatch(true);
    try {
      const success = await useSupabaseStore.getState().updateStockBatch(
        batchToEdit.id,
        batchToEdit.client_id,
        editFormData
      );

      if (success) {
        toast.success('Lote Actualizado', 'Los cambios se han guardado y el stock del cliente ha sido sincronizado.');
        setShowEditModal(false);
        // Refresh batches
        if (expandedClient) {
          const batches = await fetchClientBatches(expandedClient);
          setClientBatches(batches);
        }
      } else {
        toast.error('Error', 'No se pudieron guardar los cambios en el lote.');
      }
    } catch (error) {
      console.error('Error updating batch:', error);
      toast.error('Error', 'Ocurrió un error inesperado al actualizar el lote.');
    } finally {
      setIsUpdatingBatch(false);
    }
  };

  // Export batches to PDF for single client
  const exportPDF = (client: any, groups: any[]) => {
    const doc = new jsPDF();

    // Header
    doc.setFillColor(63, 81, 181); // Indigo color
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('REPORTE DE INGRESOS MENSUAL', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('SISTEMA DE GESTIÓN LOGÍSTICA - MINERA INMACULADA CONCEPCIÓN', 105, 30, { align: 'center' });

    // Client Info
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', 14, 55);
    doc.line(14, 57, 196, 57);

    doc.setFont('helvetica', 'normal');
    const infoY = 65;
    doc.text(`Cliente: ${client.name}`, 14, infoY);
    doc.text(`Tipo: ${client.client_type || 'N/A'}`, 14, infoY + 7);
    const filterText = monthFilter === 'all' ? 'Todo el histórico' : monthFilter === 'current' ? 'Mes Actual' : 'Mes Anterior';
    doc.text(`Periodo Reportado: ${filterText}`, 14, infoY + 14);
    doc.text(`Fecha Emisión: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`, 120, infoY);

    // Filter calculations
    let totalCuarzo = 0;
    let totalLlampo = 0;
    let totalIncome = 0;

    groups.forEach(grp => {
      grp.inputs.forEach((b: any) => {
        if (b.sub_mineral === 'CUARZO') totalCuarzo += Number(b.initial_quantity);
        if (b.sub_mineral === 'LLAMPO') totalLlampo += Number(b.initial_quantity);
      });
    });
    totalIncome = totalCuarzo + totalLlampo;

    // Summary table with only filtered totals!
    autoTable(doc, {
      startY: 90,
      head: [['RESUMEN DEL PERIODO (' + filterText + ')', 'CUARZO', 'LLAMPO', 'TOTAL CANTI.']],
      body: [
        [
          'TOTAL INGRESOS',
          `${totalCuarzo} sacos`,
          `${totalLlampo} sacos`,
          `${totalIncome} sacos`
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [63, 81, 181], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 10 }
    });

    // Detailed grouped table for the month
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE INGRESOS (POR VIAJE)', 14, (doc as any).lastAutoTable.finalY + 15);

    const tableData = groups.map(grp => {
      const czTotal = grp.inputs.filter((b:any) => b.sub_mineral === 'CUARZO').reduce((sum: number, b: any) => sum + Number(b.initial_quantity), 0);
      const llTotal = grp.inputs.filter((b:any) => b.sub_mineral === 'LLAMPO').reduce((sum: number, b: any) => sum + Number(b.initial_quantity), 0);
      const combinedTotal = czTotal + llTotal;
      return [
        formatDateSafe(grp.created_at),
        grp.zone || 'N/A',
        grp.mineral_type || 'N/A',
        czTotal,
        llTotal,
        combinedTotal
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['FECHA LLEGADA', 'ZONA', 'TIPO MIN.', 'CUARZO', 'LLAMPO', 'TOTAL']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [51, 51, 51] }
    });

    // Save
    doc.save(`Reporte_Ingresos_${client.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success('PDF Generado', 'El reporte limpio mensual se ha descargado correctamente.');
  };

  return (
    <div className="space-y-8 pb-20 max-w-[1600px] mx-auto px-4 md:px-6">
      {/* HEADER INDUSTRIAL UNIFICADO */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">SISTEMA DE LOGÍSTICA</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de Stock</h1>
          <p className="text-slate-500 font-medium flex items-center mt-1">
            <Truck size={16} className="mr-2 text-indigo-500" />
            Control de ingresos, inventario de minerales y existencias por cliente
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportarExcel}
            className="flex items-center px-5 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-sm font-bold text-sm"
          >
            <Download size={18} className="mr-3" />
            EXPORTAR CSV
          </button>
          <button
            onClick={abrirModalNuevo}
            className="flex items-center px-5 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 font-bold text-sm"
          >
            <Plus size={18} className="mr-3" />
            REGISTRAR INGRESO
          </button>
        </div>
      </div>

      {/* KPI CARDS - DISEÑO INDUSTRIAL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {[
          { label: 'STOCK TOTAL', value: formatNumber(totalStock), icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', trend: 'Actual', trendUp: true },
          { label: 'MINERAL CUARZO', value: formatNumber(totalCuarzo), icon: ArrowUpDown, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', trend: 'Sacos', trendUp: true },
          { label: 'MINERAL LLAMPO', value: formatNumber(totalLlampo), icon: ArrowDownWideNarrow, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', trend: 'Sacos', trendUp: true },
          { label: 'CLIENTES ACTIVOS', value: formatNumber(clients.filter(c => (c.stock_cuarzo || 0) + (c.stock_llampo || 0) > 0).length), icon: User, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100', trend: 'Con Saldo', trendUp: true },
        ].map((kpi) => (
          <div key={kpi.label} className="group kpi-card flex flex-col justify-between">
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 sm:p-4 ${kpi.bg} ${kpi.border} rounded-xl sm:rounded-2xl border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <kpi.icon className={`${kpi.color} w-4 h-4 sm:w-7 sm:h-7`} strokeWidth={2.5} />
              </div>
              <div className="hidden sm:flex items-center px-2 py-1 rounded-lg text-[10px] font-black text-slate-400 bg-slate-50">
                {kpi.trend}
              </div>
            </div>
            <div>
              <p className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1 truncate" title={kpi.label}>{kpi.label}</p>
              <div className="flex items-baseline gap-1 sm:gap-2 truncate">
                <h3 className="text-lg sm:text-3xl font-black text-slate-900 tracking-tight truncate">{kpi.value}</h3>
                <span className="text-[8px] sm:text-xs font-bold text-slate-400">sacos</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTROS MASTER - ESTILO INDUSTRIAL */}
      <div className="bg-slate-50 rounded-[2.5rem] p-6 lg:p-8 border border-white shadow-xl shadow-slate-200/50">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buscar Cliente</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={18} />
              <input
                type="text"
                list="clientes-datalist"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none shadow-sm"
              />
              <datalist id="clientes-datalist">
                {allClients.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cliente</label>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer shadow-sm"
            >
              <option value="all">Todos los registros</option>
              <option value="MINERO">Minero Directo</option>
              <option value="PALLAQUERO">Pallaqueros</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              onClick={() => fetchClients()}
              className="flex-1 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center"
            >
              <RefreshCw size={16} className={`mr-2 ${clientsLoading ? 'animate-spin' : ''}`} /> ACTUALIZAR
            </button>
            <div className="relative">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'total' | 'name')}
                className="px-4 py-3.5 bg-white border border-slate-200 text-slate-400 rounded-2xl hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm outline-none appearance-none font-bold text-xs"
              >
                <option value="total">↕ Stock</option>
                <option value="name">↕ A-Z</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA DE INVENTARIO - DISEÑO TIPO REPORTE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px] border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">IDENTIFICACIÓN CLIENTE</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">ZONA</th>
                <th className="px-6 py-6 text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] text-center bg-amber-50/30">CUARZO</th>
                <th className="px-6 py-6 text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] text-center bg-indigo-50/30">LLAMPO</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">HISTÓRICO</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] text-center">TOTAL BALANCE</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">ÚLTIMO MOVIMIENTO</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">GESTIONAR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {clientsLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20">
                    <LoadingSpinner text="Sincronizando existencias..." />
                  </td>
                </tr>
              ) : sortedClients.map((client) => (
                <React.Fragment key={client.id}>
                  <tr className="hover:bg-slate-50/80 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-indigo-50 rounded-xl mr-4 flex items-center justify-center border border-indigo-100 text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 tracking-tight text-base truncate">{client.name}</p>
                          <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[9px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-600">
                            {client.client_type}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      {client.zone ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                          {client.zone}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic text-xs">---</span>
                      )}
                    </td>
                    <td className="px-6 py-6 text-center bg-amber-50/10">
                      <span className="text-lg font-black text-amber-600">{(client.stock_cuarzo || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-6 text-center bg-indigo-50/10">
                      <span className="text-lg font-black text-indigo-600">{(client.stock_llampo || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-900 mb-1" title="Total Histórico (Cuarzo + Llampo)">
                          TOTAL: {((client.cumulative_cuarzo || 0) + (client.cumulative_llampo || 0)).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          <span className="text-[9px] font-black text-amber-600/60" title="Total Cuarzo histórico">H. Cu: {(client.cumulative_cuarzo || 0).toLocaleString()}</span>
                          <span className="text-[9px] font-black text-indigo-600/60" title="Total Llampo histórico">H. Ll: {(client.cumulative_llampo || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="text-xl font-black text-slate-900 leading-none">
                          {((client.stock_cuarzo || 0) + (client.stock_llampo || 0)).toLocaleString()}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">Sacos</span>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-black text-slate-700">
                          <Calendar size={12} className="inline mr-1 text-slate-400" />
                          {client.last_intake_date ? formatDateSafe(client.last_intake_date) : 'SIN REGISTRO'}
                        </span>
                        {client.last_intake_zone && (
                          <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest mt-1">
                            ZONA: {client.last_intake_zone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex gap-2">
                        <button
                          className="p-3 bg-white border border-slate-200 text-indigo-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-90"
                          onClick={() => toggleBatches(client.id)}
                          title="Ver Lotes / Historial"
                        >
                          {expandedClient === client.id ? <ChevronUp size={20} strokeWidth={3} /> : <FileText size={20} strokeWidth={3} />}
                        </button>
                        <button
                          className="p-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-90"
                          onClick={() => {
                            setNuevoIngreso(prev => ({
                              ...prev,
                              clienteId: client.id,
                              tipoCliente: client.client_type || '',
                              clienteNombre: client.name,
                              zona: client.zone || ''
                            }));
                            setShowModal(true);
                          }}
                          title="Registrar Ingreso"
                        >
                          <Plus size={20} strokeWidth={3} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Batches View */}
                  {expandedClient === client.id && (
                    <tr className="bg-slate-50 border-x-4 border-l-indigo-500 border-r-transparent">
                      <td colSpan={8} className="p-0">
                        <div className="px-4 sm:px-8 py-8 sticky left-0 w-[calc(100vw-32px)] md:w-full lg:static box-border">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Historial de Ingresos Consolidados</h4>
                            <p className="text-xs text-slate-500 font-medium">Traceabilidad agrupada por viaje/carga para {client.name}</p>
                          </div>
                          
                          <div className="flex items-center gap-3 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                            <select 
                              value={monthFilter}
                              onChange={(e) => setMonthFilter(e.target.value)}
                              className="bg-transparent text-sm font-bold text-slate-700 outline-none pr-4 cursor-pointer"
                            >
                              <option value="all">Todo Histórico</option>
                              <option value="current">Mes Actual</option>
                              <option value="prev">Mes Anterior</option>
                            </select>
                            <button
                              onClick={() => exportPDF(client, groupedBatches)}
                              className="flex items-center px-4 py-2 bg-indigo-600 border border-transparent text-white rounded-lg hover:bg-indigo-700 transition-all font-black text-[10px] tracking-widest shadow-md flex-shrink-0"
                            >
                              <Download size={14} className="mr-2" /> PDF
                            </button>
                          </div>
                        </div>

                        {batchesLoading ? (
                          <div className="flex justify-center py-10">
                            <LoadingSpinner text="Cargando historial unificado..." />
                          </div>
                        ) : groupedBatches.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {groupedBatches.map((grp: any) => {
                              const totalInicial = grp.inputs.reduce((sum: number, b: any) => sum + Number(b.initial_quantity), 0);
                              const totalRestante = grp.inputs.reduce((sum: number, b: any) => sum + Number(b.remaining_quantity), 0);
                              
                              const isAllDepleted = totalRestante === 0;

                              return (
                                <div
                                  key={grp.id}
                                  className={`p-6 rounded-[1.5rem] border transition-all ${!isAllDepleted
                                    ? 'bg-white border-slate-200 shadow-sm'
                                    : 'bg-slate-100/50 border-slate-100 opacity-75'
                                    }`}
                                >
                                  {/* Header del Grupo (Viaje) */}
                                  <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                                    <div className="flex flex-col min-w-0 pr-2">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{formatDateSafe(grp.created_at)}</span>
                                      <span className="flex items-center text-[11px] sm:text-xs font-bold text-slate-500 mt-1 truncate">
                                        <Truck size={12} className="mr-1 text-slate-400 flex-shrink-0" />
                                        <span className="truncate">Z: {grp.zone || 'N/A'}</span>
                                      </span>
                                    </div>
                                    <div className="flex flex-col items-end flex-shrink-0">
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-xl sm:text-2xl font-black text-slate-900">{totalInicial}</span>
                                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 tracking-widest uppercase">SACOS</span>
                                      </div>
                                      <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase mb-1">TOTAL INGRESÓ</span>
                                      {totalRestante > 0 && (
                                        <div className="bg-emerald-500 text-white px-2 py-1 rounded-md shadow-sm shadow-emerald-200 flex items-center font-black text-[10px] tracking-widest mt-0.5 animate-pulse">
                                           {totalRestante} DISPONIBLES
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Desglose de Minerales en el Grupo */}
                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                                    {grp.inputs.map((batch: any, index: number) => (
                                      <div key={batch.id} className={`relative ${index > 0 ? 'border-t border-slate-200 pt-3 mt-3' : ''}`}>
                                        <div className="flex justify-between items-center mb-2">
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${batch.sub_mineral === 'CUARZO'
                                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                              }`}>
                                              {batch.sub_mineral}
                                            </span>
                                            <button
                                              onClick={() => handleUpdateMineralType(batch.id, batch.mineral_type || 'OXIDO')}
                                              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter border transition-all shadow-sm ${batch.mineral_type === 'SULFURO'
                                                ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                                : 'bg-teal-50 text-teal-600 border-teal-200 hover:bg-teal-100'
                                                }`}
                                              title="Cambiar Tipo (Óxido/Sulfuro)"
                                            >
                                              {batch.mineral_type || 'OXIDO'}
                                            </button>
                                          </div>
                                          
                                          <div className="flex items-center gap-2">
                                            {user?.role === 'ADMIN' && (
                                              <button
                                                onClick={() => handleEditClick(batch)}
                                                className="p-1.5 text-slate-400 bg-white border border-slate-200 rounded-md hover:text-indigo-600 hover:border-indigo-300 transition-colors shadow-sm"
                                                title="Administrar cantidades (Admin)"
                                              >
                                                <Edit size={12} />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDeleteClick(batch)}
                                              className="p-1.5 text-slate-400 bg-white border border-slate-200 rounded-md hover:text-rose-500 hover:border-rose-300 transition-colors shadow-sm"
                                              title="Eliminar este ingreso (Revierte el saldo)"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-3">
                                          <div className="w-full">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2">
                                              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 sm:mb-0">
                                                Inicial: <span className="text-slate-700">{batch.initial_quantity}</span>
                                              </span>
                                              <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block w-fit ${
                                                batch.remaining_quantity > 0 
                                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm'
                                                  : 'bg-slate-100 text-slate-400'
                                              }`}>
                                                {batch.remaining_quantity} DISP.
                                              </span>
                                            </div>
                                            <div className="h-1.5 sm:h-2 bg-slate-200 rounded-full overflow-hidden w-full shadow-inner">
                                              <div
                                                className={`h-full transition-all duration-500 rounded-r-full ${batch.sub_mineral === 'CUARZO' ? 'bg-amber-400' : 'bg-indigo-500'}`}
                                                style={{ width: `${Math.min(100, (batch.remaining_quantity / batch.initial_quantity) * 100)}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                            <Package className="mx-auto text-slate-300 mb-3" size={40} />
                            <p className="text-slate-600 font-bold">No hay registros de ingreso en este periodo</p>
                            <p className="text-slate-400 text-xs mt-1">Intente cambiar el filtro de mes</p>
                          </div>
                        )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {
        !clientsLoading && sortedClients.length === 0 && (
          <div className="flex flex-col items-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm mt-8">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Package className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No se encontraron clientes</h3>
            <p className="text-sm text-slate-500">Intente cambiar los filtros de búsqueda</p>
          </div>
        )
      }

      {/* Modal de Nuevo Ingreso */}
      <FormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={guardarIngreso}
        title="Registrar Ingreso de Mineral"
        icon={Truck}
        submitLabel="Confirmar Ingreso"
        isLoading={loading || isSubmitting}
        isValid={!!nuevoIngreso.clienteId && nuevoIngreso.total > 0 && !isSubmitting}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Cliente *</label>
              <ClientSelector
                clients={clients}
                selectedClientId={nuevoIngreso.clienteId}
                onClientChange={(clientId) => {
                  const client = clients.find(c => c.id === clientId);
                  setNuevoIngreso({
                    ...nuevoIngreso,
                    clienteId: clientId,
                    clienteNombre: client?.name || '',
                    tipoCliente: client?.client_type || ''
                  });
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Fecha Recepción *</label>
              <input
                type="date"
                value={nuevoIngreso.fechaRecepcion}
                onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, fechaRecepcion: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Zona Procedencia *</label>
              <select
                value={nuevoIngreso.zona}
                onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, zona: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
                required
              >
                <option value="">Seleccionar Zona</option>
                {zones.map(z => (
                  <option key={z.id} value={z.name}>{z.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tipo de Mineral *</label>
            <div className="grid grid-cols-2 gap-2">
              {MINERAL_TYPES_STOCK.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setNuevoIngreso({ ...nuevoIngreso, mineralType: type.value as 'OXIDO' | 'SULFURO' })}
                  className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${nuevoIngreso.mineralType === type.value
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                    }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-inner">
              <label className="block text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">CANT. CUARZO</label>
              <input
                type="number"
                min="0"
                value={nuevoIngreso.cuarzo || ''}
                onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, cuarzo: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent text-3xl font-black text-amber-900 border-none focus:ring-0 outline-none transition-all placeholder:text-amber-200"
                placeholder="0"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CANT. LLAMPO</label>
              <input
                type="number"
                min="0"
                value={nuevoIngreso.llampo || ''}
                onChange={(e) => setNuevoIngreso({ ...nuevoIngreso, llampo: parseInt(e.target.value) || 0 })}
                className="w-full bg-transparent text-3xl font-black text-slate-900 border-none focus:ring-0 outline-none transition-all placeholder:text-slate-200"
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-indigo-900 p-5 rounded-2xl flex items-center justify-between shadow-lg">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-800 rounded-lg mr-3">
                <Package className="text-white" size={20} />
              </div>
              <span className="font-bold text-white uppercase text-xs tracking-widest">Total a Ingresar</span>
            </div>
            <span className="text-3xl font-black text-white">{nuevoIngreso.total.toLocaleString()} <span className="text-xs">SACOS</span></span>
          </div>
        </div>
      </FormModal>

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteBatch}
        itemName={`${batchToDelete?.initial_quantity || 0} sacos`}
        message={`¿Está seguro de eliminar este ingreso de mineral? Se revertirán los sacos al stock del cliente y esta acción no se puede deshacer.`}
        isLoading={isDeleting}
      />

      {/* Modal de Edición de Lote (Admin) */}
      <FormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdateBatch}
        title="Administrar Lote (Admin)"
        icon={Edit}
        submitLabel="Guardar Cambios"
        isLoading={isUpdatingBatch}
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-2 text-center">Aviso de Administrador</p>
            <p className="text-xs text-amber-800 font-medium text-center">Si modifica las cantidades, el stock total del cliente se ajustará automáticamente para mantener la coherencia.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cant. Inicial</label>
              <input
                type="number"
                value={editFormData.initial_quantity}
                onChange={(e) => setEditFormData({ ...editFormData, initial_quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Cant. Restante</label>
              <input
                type="number"
                value={editFormData.remaining_quantity}
                onChange={(e) => setEditFormData({ ...editFormData, remaining_quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fecha de Ingreso</label>
            <input
              type="date"
              value={editFormData.created_at}
              onChange={(e) => setEditFormData({ ...editFormData, created_at: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Zona de Procedencia</label>
            <select
              value={editFormData.zone}
              onChange={(e) => setEditFormData({ ...editFormData, zone: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin Zona</option>
              {zones.map(z => (
                <option key={z.id} value={z.name}>{z.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tipo de Mineral</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditFormData({ ...editFormData, mineral_type: 'OXIDO' })}
                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${editFormData.mineral_type === 'OXIDO' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}
              >
                Óxido
              </button>
              <button
                type="button"
                onClick={() => setEditFormData({ ...editFormData, mineral_type: 'SULFURO' })}
                className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${editFormData.mineral_type === 'SULFURO' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}
              >
                Sulfuro
              </button>
            </div>
          </div>
        </div>
      </FormModal>
    </div >
  );
};

export default Stock;
