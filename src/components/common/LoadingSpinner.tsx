import React from 'react';
import { Loader2 } from 'lucide-react';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
type SpinnerVariant = 'spinner' | 'dots' | 'pulse';

interface LoadingSpinnerProps {
    size?: SpinnerSize;
    variant?: SpinnerVariant;
    text?: string;
    fullScreen?: boolean;
    className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
};

const textSizeClasses: Record<SpinnerSize, string> = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    variant = 'spinner',
    text,
    fullScreen = false,
    className = ''
}) => {
    const renderSpinner = () => {
        switch (variant) {
            case 'spinner':
                return <Loader2 className={`${sizeClasses[size]} animate-spin text-indigo-600`} />;

            case 'dots':
                return (
                    <div className="flex gap-1">
                        <div className={`${sizeClasses[size]} bg-indigo-600 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }} />
                        <div className={`${sizeClasses[size]} bg-indigo-600 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }} />
                        <div className={`${sizeClasses[size]} bg-indigo-600 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }} />
                    </div>
                );

            case 'pulse':
                return (
                    <div className={`${sizeClasses[size]} bg-indigo-600 rounded-full animate-pulse`} />
                );

            default:
                return null;
        }
    };

    const content = (
        <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
            {renderSpinner()}
            {text && (
                <p className={`${textSizeClasses[size]} text-slate-600 font-medium`}>
                    {text}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
                {content}
            </div>
        );
    }

    return content;
};

// Skeleton loader para tablas
export const SkeletonRow: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-4 bg-slate-200 rounded"></div>
                </td>
            ))}
        </tr>
    );
};

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
    rows = 5,
    columns = 5
}) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <tbody>
                    {Array.from({ length: rows }).map((_, i) => (
                        <SkeletonRow key={i} columns={columns} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};
