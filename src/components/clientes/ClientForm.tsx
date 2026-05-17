import React from 'react';
import { FormModal } from '../ui/FormModal';
import { UserPlus, Edit, Settings, MapPin, User, Phone, Mail, FileText, Home, StickyNote } from 'lucide-react';

interface ClientFormData {
    nombre: string;
    contacto: string;
    telefono: string;
    email: string;
    ruc: string;
    direccion: string;
    zona: string;
    tipoCliente: string;
    observaciones: string;
}

interface ClientFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void | Promise<void>;
    formData: ClientFormData;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    zones: Array<{ id: string; name: string }>;
    isLoading?: boolean;
    isEditing?: boolean;
    onAddZone?: () => void;
    isAddingZone?: boolean;
    newZoneName?: string;
    onNewZoneNameChange?: (value: string) => void;
    onToggleAddZone?: () => void;
    onManageZones?: () => void;
    errors?: Record<string, string>;
}

const inputBase = "w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-slate-50 hover:bg-white";
const inputError = "border-red-400 ring-1 ring-red-200 bg-red-50/30";
const inputNormal = "border-slate-200";
const labelBase = "block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1";

export const ClientForm: React.FC<ClientFormProps> = ({
    isOpen,
    onClose,
    onSubmit,
    formData,
    onChange,
    zones,
    isLoading = false,
    isEditing = false,
    onAddZone,
    isAddingZone = false,
    newZoneName = '',
    onNewZoneNameChange,
    onToggleAddZone,
    onManageZones,
    errors = {}
}) => {
    const isValid = !!(formData.nombre && formData.tipoCliente);

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            onSubmit={onSubmit}
            title={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
            icon={isEditing ? Edit : UserPlus}
            size="lg"
            submitLabel={isEditing ? 'Guardar Cambios' : 'Guardar Cliente'}
            cancelLabel="Cancelar"
            isLoading={isLoading}
            isValid={isValid}
        >
            <div className="space-y-3">

                {/* ── FILA 1: Nombre (full width) ── */}
                <div>
                    <label className={labelBase}>
                        Nombre / Razón Social <span className="text-red-500 normal-case font-bold">*</span>
                    </label>
                    <div className="relative">
                        <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={onChange}
                            className={`${inputBase} ${errors.nombre ? inputError : inputNormal}`}
                            placeholder="Ej: Minera Andina SAC"
                            autoFocus
                        />
                    </div>
                    {errors.nombre && <p className="text-[11px] text-red-500 mt-1 ml-1">{errors.nombre}</p>}
                </div>

                {/* ── FILA 2: Tipo + Zona (2 columnas) ── */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Tipo de Cliente */}
                    <div>
                        <label className={labelBase}>
                            Tipo de Cliente <span className="text-red-500 normal-case font-bold">*</span>
                        </label>
                        <div className="relative">
                            <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                            <select
                                name="tipoCliente"
                                value={formData.tipoCliente}
                                onChange={onChange}
                                className={`${inputBase} ${errors.tipoCliente ? inputError : inputNormal} cursor-pointer`}
                            >
                                <option value="">Seleccionar tipo...</option>
                                <option value="MINERO">⛏ Minero</option>
                                <option value="PALLAQUERO">🪨 Pallaquero</option>
                            </select>
                        </div>
                        {errors.tipoCliente && <p className="text-[11px] text-red-500 mt-1 ml-1">{errors.tipoCliente}</p>}
                    </div>

                    {/* Zona */}
                    <div>
                        <label className={`${labelBase} flex items-center justify-between`}>
                            <span>Zona</span>
                            <div className="flex items-center gap-2 normal-case font-normal">
                                {!isEditing && onToggleAddZone && (
                                    <button
                                        type="button"
                                        onClick={onToggleAddZone}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                    >
                                        {isAddingZone ? '← Volver' : '+ Nueva'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={onManageZones}
                                    className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                                >
                                    <Settings size={11} /> Gestionar
                                </button>
                            </div>
                        </label>

                        {!isAddingZone || isEditing ? (
                            <div className="relative">
                                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                                <select
                                    name="zona"
                                    value={formData.zona}
                                    onChange={onChange}
                                    className={`${inputBase} ${errors.zona ? inputError : inputNormal} cursor-pointer`}
                                >
                                    <option value="">Sin zona asignada</option>
                                    {zones.map(z => (
                                        <option key={z.id} value={z.name}>{z.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newZoneName}
                                    onChange={(e) => onNewZoneNameChange?.(e.target.value)}
                                    placeholder="Nombre de la zona"
                                    className={`${inputBase} ${inputNormal} flex-1`}
                                />
                                <button
                                    type="button"
                                    onClick={onAddZone}
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-black transition-colors shrink-0"
                                >
                                    OK
                                </button>
                            </div>
                        )}
                        {errors.zona && <p className="text-[11px] text-red-500 mt-1 ml-1">{errors.zona}</p>}
                    </div>
                </div>

                {/* ── FILA 3: Contacto + Teléfono (2 columnas) ── */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelBase}>Contacto Principal</label>
                        <div className="relative">
                            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                name="contacto"
                                value={formData.contacto}
                                onChange={onChange}
                                className={`${inputBase} ${inputNormal}`}
                                placeholder="Nombre del responsable"
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelBase}>Teléfono</label>
                        <div className="relative">
                            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="tel"
                                name="telefono"
                                value={formData.telefono}
                                onChange={onChange}
                                className={`${inputBase} ${inputNormal}`}
                                placeholder="987 654 321"
                            />
                        </div>
                    </div>
                </div>

                {/* ── FILA 4: RUC + Email (2 columnas) ── */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelBase}>RUC / DNI</label>
                        <div className="relative">
                            <FileText size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                name="ruc"
                                value={formData.ruc}
                                onChange={onChange}
                                className={`${inputBase} ${inputNormal}`}
                                placeholder="20123456789"
                            />
                        </div>
                    </div>
                    <div>
                        <label className={labelBase}>Correo Electrónico</label>
                        <div className="relative">
                            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={onChange}
                                className={`${inputBase} ${inputNormal}`}
                                placeholder="correo@empresa.com"
                            />
                        </div>
                    </div>
                </div>

                {/* ── FILA 5: Dirección (full width) ── */}
                <div>
                    <label className={labelBase}>Dirección</label>
                    <div className="relative">
                        <Home size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            name="direccion"
                            value={formData.direccion}
                            onChange={onChange}
                            className={`${inputBase} ${inputNormal}`}
                            placeholder="Av. Principal 123, Huancavelica"
                        />
                    </div>
                </div>

                {/* ── FILA 6: Observaciones (textarea compacto) ── */}
                <div>
                    <label className={labelBase}>Observaciones</label>
                    <div className="relative">
                        <StickyNote size={15} className="absolute left-3 top-3 text-slate-400" />
                        <textarea
                            name="observaciones"
                            value={formData.observaciones}
                            onChange={onChange}
                            className={`${inputBase} ${inputNormal} pl-9 resize-none`}
                            rows={2}
                            placeholder="Notas internas, referencias o acuerdos especiales..."
                        />
                    </div>
                </div>

                {/* ── Indicador de campos obligatorios ── */}
                <p className="text-[10px] text-slate-400 font-medium">
                    <span className="text-red-400 font-bold">*</span> Campos obligatorios
                </p>
            </div>
        </FormModal>
    );
};
