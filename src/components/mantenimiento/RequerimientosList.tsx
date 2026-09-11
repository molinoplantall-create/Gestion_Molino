import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Wrench, AlertTriangle, CheckCircle2, RotateCcw, Trash2, Pencil, Package } from 'lucide-react';
import { useSupabaseStore } from '@/store/supabaseStore';
import { useToast } from '@/hooks/useToast';
import { FormModal } from '@/components/ui/FormModal';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { useModal } from '@/hooks/useModal';
import { MillRequirement, MillRequirementInput } from '@/types';

const emptyForm: MillRequirementInput = {
  mill_id: '',
  item_name: '',
  model_spec: '',
  quantity: 1,
  priority: 'NORMAL',
  estimated_cost_pen: 0,
  estimated_cost_usd: 0,
  provider: '',
  notes: '',
  requested_by: ''
};

const PRIORITY_STYLES: Record<string, string> = {
  URGENTE: 'bg-red-100 text-red-700 border-red-200',
  NORMAL: 'bg-slate-100 text-slate-600 border-slate-200',
  BAJA: 'bg-slate-50 text-slate-400 border-slate-100'
};

export const RequerimientosList: React.FC = () => {
  const {
    mills, millRequirements, requirementsLoading,
    fetchMillRequirements, createMillRequirement, updateMillRequirement,
    resolveMillRequirement, reopenMillRequirement, deleteMillRequirement
  } = useSupabaseStore();
  const toast = useToast();

  const [filterMill, setFilterMill] = useState('TODOS');
  const [filterStatus, setFilterStatus] = useState<'PENDIENTE' | 'RESUELTO' | 'TODOS'>('PENDIENTE');
  const [currency, setCurrency] = useState<'PEN' | 'USD'>('PEN');
  const [formData, setFormData] = useState<MillRequirementInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formModal = useModal<void>();
  const deleteModal = useModal<MillRequirement>();

  useEffect(() => {
    fetchMillRequirements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return millRequirements
      .filter(r => filterMill === 'TODOS' || r.mill_id === filterMill)
      .filter(r => filterStatus === 'TODOS' || r.status === filterStatus)
      .sort((a, b) => {
        const order: Record<string, number> = { URGENTE: 0, NORMAL: 1, BAJA: 2 };
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
      });
  }, [millRequirements, filterMill, filterStatus]);

  // Costo total estimado de lo pendiente (para presupuestar)
  const totalPendiente = useMemo(() => {
    const pendientes = millRequirements.filter(r => r.status === 'PENDIENTE');
    return {
      pen: pendientes.reduce((sum, r) => sum + (r.estimated_cost_pen || 0), 0),
      usd: pendientes.reduce((sum, r) => sum + (r.estimated_cost_usd || 0), 0),
      count: pendientes.length
    };
  }, [millRequirements]);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setCurrency('PEN');
    formModal.open();
  };

  const handleOpenEdit = (r: MillRequirement) => {
    setEditingId(r.id);
    setCurrency(r.estimated_cost_usd && r.estimated_cost_usd > 0 ? 'USD' : 'PEN');
    setFormData({
      mill_id: r.mill_id || '',
      item_name: r.item_name,
      model_spec: r.model_spec || '',
      quantity: r.quantity || 1,
      priority: r.priority,
      estimated_cost_pen: r.estimated_cost_pen || 0,
      estimated_cost_usd: r.estimated_cost_usd || 0,
      provider: r.provider || '',
      notes: r.notes || '',
      requested_by: r.requested_by || ''
    });
    formModal.open();
  };

  const handleCurrencyChange = (newCurrency: 'PEN' | 'USD') => {
    if (newCurrency === currency) return;
    if (newCurrency === 'PEN') {
      setFormData(prev => ({ ...prev, estimated_cost_pen: prev.estimated_cost_usd || prev.estimated_cost_pen || 0, estimated_cost_usd: 0 }));
    } else {
      setFormData(prev => ({ ...prev, estimated_cost_usd: prev.estimated_cost_pen || prev.estimated_cost_usd || 0, estimated_cost_pen: 0 }));
    }
    setCurrency(newCurrency);
  };

  const handleSubmit = async () => {
    if (!formData.mill_id || !formData.item_name) {
      toast.warning('Faltan datos', 'Selecciona el molino y qué es lo que falta.');
      return;
    }
    setIsSubmitting(true);
    const success = editingId
      ? await updateMillRequirement(editingId, formData)
      : await createMillRequirement(formData);
    setIsSubmitting(false);

    if (success) {
      toast.success(editingId ? 'Actualizado' : 'Agregado', 'El requerimiento se guardó correctamente.');
      formModal.close();
    } else {
      toast.error('Error', 'No se pudo guardar el requerimiento.');
    }
  };

  const handleResolve = async (r: MillRequirement) => {
    const success = await resolveMillRequirement(r.id);
    if (success) toast.success('Resuelto', `"${r.item_name}" se marcó como resuelto.`);
  };

  const handleReopen = async (r: MillRequirement) => {
    const success = await reopenMillRequirement(r.id);
    if (success) toast.info('Reabierto', `"${r.item_name}" volvió a estar pendiente.`);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.data) return;
    const success = await deleteMillRequirement(deleteModal.data.id);
    if (success) {
      toast.success('Eliminado', 'El requerimiento se eliminó.');
      deleteModal.close();
    } else {
      toast.error('Error', 'No se pudo eliminar.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header + filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Lista de Requerimientos</h2>
          <p className="text-xs font-medium text-slate-400 mt-0.5">Repuestos y piezas pendientes por molino</p>
        </div>
        <button
          onClick={handleOpenNew}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 transition-all"
        >
          <Plus size={18} /> Nuevo Requerimiento
        </button>
      </div>

      {/* Costo total pendiente (presupuesto) */}
      {totalPendiente.count > 0 && (totalPendiente.pen > 0 || totalPendiente.usd > 0) && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-wrap items-center gap-x-8 gap-y-2">
          <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">Total Pendiente de Comprar</span>
          {totalPendiente.pen > 0 && <span className="text-lg font-black text-indigo-700">S/ {totalPendiente.pen.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>}
          {totalPendiente.usd > 0 && <span className="text-lg font-black text-indigo-700">$ {totalPendiente.usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>}
          <span className="text-xs font-medium text-indigo-400">({totalPendiente.count} requerimiento{totalPendiente.count !== 1 ? 's' : ''} pendiente{totalPendiente.count !== 1 ? 's' : ''})</span>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select
          value={filterMill}
          onChange={(e) => setFilterMill(e.target.value)}
          className="px-4 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-400"
        >
          <option value="TODOS">Todos los molinos</option>
          {mills.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <div className="flex bg-slate-100 rounded-xl p-1">
          {(['PENDIENTE', 'RESUELTO', 'TODOS'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterStatus === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
            >
              {s === 'PENDIENTE' ? 'Pendientes' : s === 'RESUELTO' ? 'Resueltos' : 'Todos'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {requirementsLoading && filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm font-medium">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-3xl">
          <Package className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-400 text-sm font-medium">No hay requerimientos {filterStatus === 'PENDIENTE' ? 'pendientes' : ''} para mostrar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div
              key={r.id}
              className={`bg-white border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-all ${r.status === 'RESUELTO' ? 'border-slate-100 opacity-60' : 'border-slate-200 shadow-sm'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${PRIORITY_STYLES[r.priority] || PRIORITY_STYLES.NORMAL}`}>
                    {r.priority === 'URGENTE' && <AlertTriangle size={10} className="inline mr-1 -mt-0.5" />}
                    {r.priority}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">
                    {r.mill_name}
                  </span>
                  {r.status === 'RESUELTO' && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={10} /> Resuelto
                    </span>
                  )}
                </div>
                <p className="font-black text-slate-900 text-sm">
                  {r.item_name}
                  {r.model_spec && <span className="font-medium text-slate-500"> — {r.model_spec}</span>}
                  {r.quantity && r.quantity > 1 && <span className="font-bold text-slate-400"> ×{r.quantity}</span>}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[11px] font-medium text-slate-400">
                  {(r.estimated_cost_pen ?? 0) > 0 && <span>Costo est.: S/ {r.estimated_cost_pen?.toLocaleString('es-PE')}</span>}
                  {(r.estimated_cost_usd ?? 0) > 0 && <span>Costo est.: $ {r.estimated_cost_usd?.toLocaleString('en-US')}</span>}
                  {r.provider && <span>Proveedor: {r.provider}</span>}
                  {r.requested_by && <span>Pedido por: {r.requested_by}</span>}
                  <span>{new Date(r.created_at).toLocaleDateString('es-PE')}</span>
                </div>
                {r.notes && <p className="text-xs text-slate-500 mt-1.5 italic">"{r.notes}"</p>}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {r.status === 'PENDIENTE' ? (
                  <button
                    onClick={() => handleResolve(r)}
                    title="Marcar como resuelto"
                    className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"
                  >
                    <CheckCircle2 size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleReopen(r)}
                    title="Reabrir"
                    className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100 transition-all"
                  >
                    <RotateCcw size={18} />
                  </button>
                )}
                <button
                  onClick={() => handleOpenEdit(r)}
                  title="Editar"
                  className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => deleteModal.open(r)}
                  title="Eliminar"
                  className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Crear/Editar */}
      <FormModal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        onSubmit={handleSubmit}
        title={editingId ? 'Editar Requerimiento' : 'Nuevo Requerimiento'}
        icon={Wrench}
        isLoading={isSubmitting}
        isValid={!!formData.mill_id && !!formData.item_name}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Molino *</label>
            <select
              value={formData.mill_id}
              onChange={(e) => setFormData(prev => ({ ...prev, mill_id: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecciona un molino</option>
              {mills.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué falta? *</label>
            <input
              type="text"
              value={formData.item_name}
              onChange={(e) => setFormData(prev => ({ ...prev, item_name: e.target.value }))}
              placeholder="Ej. Faja"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Modelo / Especificación</label>
            <input
              type="text"
              value={formData.model_spec}
              onChange={(e) => setFormData(prev => ({ ...prev, model_spec: e.target.value }))}
              placeholder="Ej. B-52 doble"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
            <input
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="URGENTE">Urgente</option>
              <option value="NORMAL">Normal</option>
              <option value="BAJA">Baja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Moneda</label>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value as 'PEN' | 'USD')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="PEN">S/ Soles</option>
              <option value="USD">$ Dólares</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Costo Estimado ({currency === 'PEN' ? 'S/' : '$'})</label>
            <input
              type="number"
              value={currency === 'PEN' ? (formData.estimated_cost_pen || '') : (formData.estimated_cost_usd || '')}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                setFormData(prev => currency === 'PEN' ? { ...prev, estimated_cost_pen: val } : { ...prev, estimated_cost_usd: val });
              }}
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Proveedor</label>
            <input
              type="text"
              value={formData.provider}
              onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
              placeholder="Ej. Ferretería Industrial SAC"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pedido por</label>
            <input
              type="text"
              value={formData.requested_by}
              onChange={(e) => setFormData(prev => ({ ...prev, requested_by: e.target.value }))}
              placeholder="Tu nombre"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              placeholder="Cualquier detalle adicional..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </FormModal>

      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={deleteModal.close}
        onConfirm={handleConfirmDelete}
        itemName={deleteModal.data?.item_name || ''}
      />
    </div>
  );
};