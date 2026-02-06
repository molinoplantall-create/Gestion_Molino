import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon = Inbox,
    title,
    description,
    action,
    className = ''
}) => {
    const ActionIcon = action?.icon;

    return (
        <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
            {/* Ícono */}
            <div className="mb-4 p-3 bg-slate-100 rounded-full">
                <Icon className="w-12 h-12 text-slate-400" />
            </div>

            {/* Título */}
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {title}
            </h3>

            {/* Descripción */}
            {description && (
                <p className="text-sm text-slate-600 text-center max-w-md mb-6">
                    {description}
                </p>
            )}

            {/* Botón de acción */}
            {action && (
                <button
                    onClick={action.onClick}
                    className="flex items-center gap-2 px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    {ActionIcon && <ActionIcon className="w-4 h-4" />}
                    {action.label}
                </button>
            )}
        </div>
    );
};
