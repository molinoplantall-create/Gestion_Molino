import React from 'react';
import { Users, Phone, Edit, Trash2 } from 'lucide-react';
import { Table } from '../common/Table';

interface Client {
    id: string;
    name: string;
    contact_name?: string;
    phone?: string;
    email?: string;
    ruc_dni?: string;
    address?: string;
    zone?: string;
    client_type?: string;
    is_active: boolean;
    observations?: string;
}

interface ClientTableProps {
    clients: Client[];
    loading?: boolean;
    onEdit: (client: Client) => void;
    onDelete: (client: Client) => void;
    pagination?: {
        currentPage: number;
        totalPages: number;
        pageSize: number;
        totalItems: number;
        onPageChange: (page: number) => void;
    };
}

export const ClientTable: React.FC<ClientTableProps> = ({
    clients,
    loading = false,
    onEdit,
    onDelete,
    pagination
}) => {
    const getStatusBadge = (isActive: boolean) => {
        return isActive ? (
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-full flex items-center w-fit">
                Activo
            </span>
        ) : (
            <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-semibold rounded-full flex items-center w-fit">
                Inactivo
            </span>
        );
    };

    const getZoneBadge = (zona?: string) => {
        const defaultColors = 'bg-gray-100 text-gray-800';
        const zoneColors: Record<string, string> = {
            'Norte': 'bg-blue-100 text-blue-800',
            'Sur': 'bg-green-100 text-green-800',
            'Centro': 'bg-purple-100 text-purple-800',
            'Este': 'bg-orange-100 text-orange-800',
            'Oeste': 'bg-red-100 text-red-800',
        };
        return (
            <span className={`px-2 py-1 text-xs rounded-full ${zoneColors[zona || ''] || defaultColors}`}>
                {zona || 'N/A'}
            </span>
        );
    };

    const columns = [
        {
            key: 'name',
            label: 'Cliente',
            render: (client: Client) => (
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 mr-3">
                        <Users className="text-indigo-600" size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 leading-tight">{client.name}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-tighter mt-0.5">
                            {client.client_type}
                        </p>
                    </div>
                </div>
            )
        },
        {
            key: 'contact_name',
            label: 'Contacto',
            render: (client: Client) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">
                        {client.contact_name || 'N/A'}
                    </span>
                    <div className="flex items-center text-xs text-gray-400 mt-1">
                        <Phone size={12} className="mr-1" />
                        {client.phone || 'S/T'}
                    </div>
                </div>
            )
        },
        {
            key: 'zone',
            label: 'Zona',
            className: 'text-center',
            render: (client: Client) => getZoneBadge(client.zone)
        },
        {
            key: 'is_active',
            label: 'Estado',
            className: 'text-center',
            render: (client: Client) => (
                <div className="flex justify-center">
                    {getStatusBadge(client.is_active)}
                </div>
            )
        },
        {
            key: 'actions',
            label: 'Acciones',
            className: 'text-right',
            render: (client: Client) => (
                <div className="flex items-center justify-end space-x-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(client);
                        }}
                        className="p-2 text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all"
                        title="Editar"
                    >
                        <Edit size={18} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(client);
                        }}
                        className="p-2 text-rose-600 hover:bg-slate-50 border border-transparent hover:border-rose-100 rounded-lg transition-all"
                        title="Eliminar"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <Table
            data={clients}
            columns={columns}
            loading={loading}
            pagination={pagination}
            emptyMessage="No hay clientes"
            emptyDescription="No se encontraron clientes que coincidan con los filtros."
        />
    );
};
