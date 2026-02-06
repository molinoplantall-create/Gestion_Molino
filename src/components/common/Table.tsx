import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { LoadingSpinner, SkeletonTable } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

interface Column<T> {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    className?: string;
}

interface TableProps<T> {
    data: T[];
    columns: Column<T>[];
    loading?: boolean;
    emptyMessage?: string;
    emptyDescription?: string;
    onRowClick?: (item: T) => void;
    // Paginación
    pagination?: {
        currentPage: number;
        totalPages: number;
        pageSize: number;
        totalItems: number;
        onPageChange: (page: number) => void;
    };
    // Ordenamiento
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    onSort?: (key: string) => void;
}

export function Table<T extends { id: string | number }>({
    data,
    columns,
    loading = false,
    emptyMessage = 'No hay datos disponibles',
    emptyDescription,
    onRowClick,
    pagination,
    sortBy,
    sortOrder,
    onSort
}: TableProps<T>) {
    const [hoveredRow, setHoveredRow] = useState<string | number | null>(null);

    const handleSort = (key: string) => {
        if (onSort) {
            onSort(key);
        }
    };

    const renderPagination = () => {
        if (!pagination) return null;

        const { currentPage, totalPages, pageSize, totalItems, onPageChange } = pagination;
        const startItem = (currentPage - 1) * pageSize + 1;
        const endItem = Math.min(currentPage * pageSize, totalItems);

        return (
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
                {/* Info */}
                <div className="text-sm text-slate-600">
                    Mostrando <span className="font-medium">{startItem}</span> a{' '}
                    <span className="font-medium">{endItem}</span> de{' '}
                    <span className="font-medium">{totalItems}</span> resultados
                </div>

                {/* Botones de paginación */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Primera página"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Página anterior"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => onPageChange(pageNum)}
                                    className={`
                    px-3 py-1 rounded-lg text-sm font-medium transition-colors
                    ${currentPage === pageNum
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-600 hover:bg-slate-200'
                                        }
                  `}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Página siguiente"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label="Última página"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    // Loading state
    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <SkeletonTable rows={5} columns={columns.length} />
            </div>
        );
    }

    // Empty state
    if (data.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow">
                <EmptyState
                    title={emptyMessage}
                    description={emptyDescription}
                    className="py-12"
                />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`
                    px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider
                    ${column.sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''}
                    ${column.className || ''}
                  `}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.label}
                                        {column.sortable && sortBy === column.key && (
                                            <span className="text-indigo-600">
                                                {sortOrder === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {data.map((item) => (
                            <tr
                                key={item.id}
                                className={`
                  transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
                  ${hoveredRow === item.id ? 'bg-slate-50' : ''}
                `}
                                onClick={() => onRowClick?.(item)}
                                onMouseEnter={() => setHoveredRow(item.id)}
                                onMouseLeave={() => setHoveredRow(null)}
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`px-6 py-4 text-sm text-slate-900 ${column.className || ''}`}
                                    >
                                        {column.render
                                            ? column.render(item)
                                            : (item as any)[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {renderPagination()}
        </div>
    );
}
