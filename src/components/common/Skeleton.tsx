import React from 'react';

export const Skeleton = ({ className = '', variant = 'rect' }: { className?: string; variant?: 'rect' | 'circle' | 'text' }) => {
  const baseClasses = "animate-pulse bg-slate-100";
  const variantClasses = {
    rect: "rounded-xl",
    circle: "rounded-full",
    text: "rounded h-4 w-full"
  };

  return <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />;
};

export const CardSkeleton = () => (
  <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-saas space-y-4">
    <Skeleton className="h-6 w-1/3" />
    <Skeleton className="h-32 w-full" />
    <div className="flex gap-2">
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-8 w-20" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-4">
    <div className="flex gap-4 px-8 py-4 bg-slate-50 border-b border-slate-100">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex gap-4 px-8 py-6">
        <Skeleton className="h-10 w-10 circle" />
        <div className="flex-grow space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    ))}
  </div>
);
